import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';

/**
 * Verifies whether the authenticated user has access to view or manage a procurement record
 */
export const verifyProcurementAccess = async (procurementId, user, requiredAction = 'READ') => {
  const procurement = await prisma.procurementRecord.findUnique({
    where: { id: procurementId },
    include: {
      pilot: true,
      challenge: { include: { department: true } },
      startup: true,
      payments: true,
      initiator: { select: { id: true, name: true, email: true, role: true } },
      approver: { select: { id: true, name: true, email: true, role: true } },
      acceptor: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  if (!procurement) {
    throw new NotFoundError(`Procurement record with ID ${procurementId} not found.`);
  }

  if (user.role === 'ADMIN') {
    return procurement;
  }

  if (user.role === 'GOVERNMENT') {
    if (user.department_id && procurement.department_id === user.department_id) {
      return procurement;
    }
    if (procurement.initiated_by === user.id || procurement.approved_by === user.id) {
      return procurement;
    }
    throw new ForbiddenError('You are not authorized to access procurement records for another department.');
  }

  if (user.role === 'STARTUP') {
    if (procurement.startup.user_id === user.id) {
      if (['APPROVE', 'GEM_HANDOFF', 'ACCEPT'].includes(requiredAction)) {
        throw new ForbiddenError('Startups cannot perform government administrative or approval actions.');
      }
      return procurement;
    }
    throw new ForbiddenError('You are not authorized to access another startup\'s procurement records.');
  }

  if (user.role === 'EVALUATOR') {
    throw new ForbiddenError('Evaluators are not authorized to access post-pilot procurement management records.');
  }

  throw new ForbiddenError('Access denied.');
};

/**
 * 1. Initialize Procurement Readiness Package after successful Pilot validation and SCALE decision
 */
export const createProcurementReadiness = async (pilotId, data, user, ip_address = null) => {
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only authorized Government officers and Administrators can initiate procurement readiness.');
  }

  const pilot = await prisma.pilot.findUnique({
    where: { id: pilotId },
    include: {
      challenge: true,
      startup: true,
      scale_decisions: { orderBy: { created_at: 'desc' } },
      validations: { orderBy: { created_at: 'desc' } }
    }
  });

  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  // Tenant check for Government officer
  if (user.role === 'GOVERNMENT' && user.department_id && pilot.challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You cannot initiate procurement for a challenge from another department.');
  }

  // Business Rule: Pilot must have a finalized SCALE decision
  const scaleDecision = pilot.scale_decisions[0];
  if (!scaleDecision || scaleDecision.decision !== 'SCALE') {
    throw new BadRequestError(
      'Procurement readiness requires an approved "SCALE" decision. Current pilot decision is ' +
      (scaleDecision ? `"${scaleDecision.decision}"` : 'missing') + '.'
    );
  }

  // Business Rule: Pilot must be validated
  const validation = pilot.validations[0];
  if (!validation || validation.status === 'NOT_VALIDATED') {
    throw new BadRequestError('Procurement readiness requires empirical pilot validation. Current validation status is incomplete.');
  }

  // Verify challenge scoping if supplied in request
  if (data.challenge_id && pilot.challenge_id !== data.challenge_id) {
    throw new BadRequestError(`Pilot ${pilotId} does not belong to Challenge ${data.challenge_id}.`);
  }

  // Prevent accidental duplicate active procurement records for the same pilot
  const existingActive = await prisma.procurementRecord.findFirst({
    where: {
      pilot_id: pilotId,
      status: { notIn: ['CANCELLED', 'REJECTED'] }
    }
  });

  if (existingActive) {
    throw new BadRequestError(`An active procurement record already exists for this pilot (ID: ${existingActive.id}, Status: ${existingActive.status}).`);
  }

  const CANONICAL_ROUTES = ['GEM', 'OTHER_APPROVED_ROUTE', 'DIRECT_APPROVED_ROUTE', 'OFFLINE_HANDOFF'];
  const route = data.route || data.procurement_route || 'GEM';

  if (!CANONICAL_ROUTES.includes(route)) {
    throw new BadRequestError(`Invalid procurement route "${route}". Valid routes are: ${CANONICAL_ROUTES.join(', ')}.`);
  }

  const {
    estimated_value,
    justification,
    technical_readiness = true,
    compliance_readiness = true,
    cybersecurity_clearance = false,
    data_protection_clearance = false
  } = data;

  if (!estimated_value || !justification) {
    throw new BadRequestError('Estimated procurement value and formal justification are mandatory.');
  }

  const procurement = await prisma.procurementRecord.create({
    data: {
      pilot_id: pilotId,
      challenge_id: pilot.challenge_id,
      startup_id: pilot.startup_id,
      department_id: pilot.challenge.department_id,
      status: 'READINESS_CHECK',
      route: route,
      estimated_value: estimated_value,
      justification: justification.trim(),
      technical_readiness: Boolean(technical_readiness),
      compliance_readiness: Boolean(compliance_readiness),
      cybersecurity_clearance: Boolean(cybersecurity_clearance),
      data_protection_clearance: Boolean(data_protection_clearance),
      initiated_by: user.id
    },
    include: {
      pilot: true,
      challenge: true,
      startup: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_READINESS_CREATED',
    entity_type: 'PROCUREMENT',
    entity_id: procurement.id,
    details: {
      pilot_id: pilotId,
      estimated_value,
      route,
      department_id: pilot.challenge.department_id
    },
    ip_address
  });

  return procurement;
};

/**
 * 2. Formal Government Procurement Approval
 */
export const approveProcurement = async (procurementId, data, user, ip_address = null) => {
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only authorized Government officers and Administrators can approve procurement packages.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'APPROVE');

  if (procurement.status !== 'READINESS_CHECK' && procurement.status !== 'DRAFT') {
    throw new BadRequestError(`Cannot approve procurement currently in "${procurement.status}" status.`);
  }

  const { approval_notes = '' } = data;

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: 'APPROVED',
      approved_by: user.id,
      approved_at: new Date(),
      approval_notes: approval_notes.trim()
    },
    include: {
      approver: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_APPROVED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      approved_by: user.name,
      estimated_value: procurement.estimated_value,
      route: procurement.route
    },
    ip_address
  });

  if (procurement.startup?.user_id) {
    await sendNotification({
      user_id: procurement.startup.user_id,
      title: 'Procurement Approved',
      message: `Your innovation solution for "${procurement.challenge?.title}" has received official government procurement sanction.`,
      type: 'PROCUREMENT_APPROVED',
      link: '/startup/pilots'
    });
  }

  return updated;
};

/**
 * 3. Legitimate GeM / Approved Route Handoff
 * SetuGov maintains honest handoff records without generating fake GeM transaction IDs
 */
export const handoffToGeM = async (procurementId, data, user, ip_address = null) => {
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only authorized Government officers can record GeM / procurement handoff.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'GEM_HANDOFF');

  if (procurement.status !== 'APPROVED') {
    throw new BadRequestError(`Procurement must be in "APPROVED" status before handoff. Current status: ${procurement.status}`);
  }

  const CANONICAL_HANDOFF_status = ['NOT_STARTED', 'READY', 'HANDED_OFF', 'EXTERNAL_PROCESSING', 'COMPLETED', 'FAILED_RETURNED'];
  const {
    gem_reference_number,
    gem_officer_name,
    gem_notes = '',
    gem_supporting_doc = null,
    gem_handoff_status = 'HANDED_OFF'
  } = data;

  const validHandoffStatus = gem_handoff_status || 'HANDED_OFF';
  if (!CANONICAL_HANDOFF_status.includes(validHandoffStatus)) {
    throw new BadRequestError(`Invalid GeM handoff status "${validHandoffStatus}". Valid status are: ${CANONICAL_HANDOFF_status.join(', ')}.`);
  }

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: 'HANDED_OFF',
      gem_handoff_status: validHandoffStatus,
      gem_handoff_date: new Date(),
      gem_reference_number: gem_reference_number ? gem_reference_number.trim() : null,
      gem_officer_name: gem_officer_name ? gem_officer_name.trim() : user.name,
      gem_notes: gem_notes.trim(),
      gem_supporting_doc: gem_supporting_doc ? gem_supporting_doc.trim() : null
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_GEM_HANDOFF_RECORDED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      gem_reference_number: updated.gem_reference_number,
      officer: updated.gem_officer_name,
      handoff_status: updated.gem_handoff_status
    },
    ip_address
  });

  return updated;
};

/**
 * 4. Contract & Purchase Order Lifecycle Issuance
 */
export const issueContract = async (procurementId, data, user, ip_address = null) => {
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can record contract / PO issuance.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'ISSUE_CONTRACT');

  if (!['APPROVED', 'HANDED_OFF'].includes(procurement.status)) {
    throw new BadRequestError(`Cannot issue contract for procurement in "${procurement.status}" status. Must be APPROVED or HANDED_OFF.`);
  }

  const {
    po_reference_number,
    contract_reference,
    contract_document_url,
    final_contract_value,
    contract_effective_date,
    contract_duration_days
  } = data;

  if (!contract_reference && !po_reference_number) {
    throw new BadRequestError('Either a Contract Reference Number or PO Reference Number is required.');
  }

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: 'CONTRACT_ISSUED',
      po_reference_number: po_reference_number ? po_reference_number.trim() : null,
      contract_reference: contract_reference ? contract_reference.trim() : null,
      contract_document_url: contract_document_url ? contract_document_url.trim() : null,
      final_contract_value: final_contract_value !== undefined ? final_contract_value : procurement.estimated_value,
      contract_issued_at: new Date(),
      contract_effective_date: contract_effective_date ? new Date(contract_effective_date) : new Date(),
      contract_duration_days: parseInt(contract_duration_days, 10) || 90
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_CONTRACT_ISSUED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      contract_reference: updated.contract_reference,
      po_reference_number: updated.po_reference_number,
      final_contract_value: updated.final_contract_value
    },
    ip_address
  });

  return updated;
};

/**
 * 5. Startup Solution Delivery Submission
 */
export const submitDelivery = async (procurementId, data, user, ip_address = null) => {
  const procurement = await verifyProcurementAccess(procurementId, user, 'SUBMIT_DELIVERY');

  if (procurement.status !== 'CONTRACT_ISSUED') {
    throw new BadRequestError(`Cannot submit delivery for procurement in "${procurement.status}" status. Contract must be issued first.`);
  }

  const { delivery_scope, delivery_evidence_url, delivery_notes = '' } = data;

  if (!delivery_scope) {
    throw new BadRequestError('Detailed delivery scope description is required.');
  }

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: 'DELIVERY_SUBMITTED',
      delivery_date: new Date(),
      delivery_scope: delivery_scope.trim(),
      delivery_evidence_url: delivery_evidence_url ? delivery_evidence_url.trim() : null,
      delivery_notes: delivery_notes.trim(),
      acceptance_status: 'PENDING'
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_DELIVERY_SUBMITTED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      submitted_by_role: user.role,
      delivery_scope: updated.delivery_scope
    },
    ip_address
  });

  return updated;
};

/**
 * 6. Government Formal Delivery Acceptance
 */
export const acceptDelivery = async (procurementId, data, user, ip_address = null) => {
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can record formal delivery acceptance.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'ACCEPT');

  if (procurement.status !== 'DELIVERY_SUBMITTED') {
    throw new BadRequestError(`Cannot accept delivery for procurement in "${procurement.status}" status. Delivery must be submitted first.`);
  }

  const { acceptance_status = 'ACCEPTED', acceptance_remarks = '' } = data;

  if (!['ACCEPTED', 'REJECTED', 'CONDITIONAL_ACCEPTANCE'].includes(acceptance_status)) {
    throw new BadRequestError(`Invalid acceptance status "${acceptance_status}".`);
  }

  const isAccepted = acceptance_status === 'ACCEPTED';
  const newStatus = isAccepted ? 'ACCEPTED' : (acceptance_status === 'REJECTED' ? 'REJECTED' : 'DELIVERY_SUBMITTED');

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: newStatus,
      acceptance_status,
      accepted_by: user.id,
      accepted_at: new Date(),
      acceptance_remarks: acceptance_remarks.trim()
    },
    include: {
      acceptor: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: `PROCUREMENT_DELIVERY_${acceptance_status}`,
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      acceptance_status,
      accepted_by: user.name,
      remarks: acceptance_remarks
    },
    ip_address
  });

  return updated;
};

/**
 * 7. Complete Procurement Lifecycle
 */
export const completeProcurement = async (procurementId, data = {}, user, ip_address = null) => {
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can mark a procurement as completed.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'COMPLETE');

  if (procurement.status !== 'ACCEPTED') {
    throw new BadRequestError(`Cannot complete procurement currently in "${procurement.status}" status. Delivery must be ACCEPTED first.`);
  }

  const { completion_notes = '' } = data;

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: 'COMPLETED'
    },
    include: {
      pilot: true,
      challenge: true,
      startup: true,
      payments: true,
      initiator: { select: { id: true, name: true, role: true } },
      approver: { select: { id: true, name: true, role: true } },
      acceptor: { select: { id: true, name: true, role: true } }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_COMPLETED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      completed_by: user.name,
      notes: completion_notes
    },
    ip_address
  });

  return updated;
};

/**
 * 8. Create Payment Record linked to Verified Acceptance
 */
export const createProcurementPayment = async (procurementId, data, user, ip_address = null) => {
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can authorize procurement payment schedules.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'CREATE_PAYMENT');

  if (procurement.acceptance_status !== 'ACCEPTED') {
    throw new BadRequestError('Payment is not eligible until formal government delivery acceptance is recorded.');
  }

  const { amount, payment_percentage = 100, reference_number } = data;

  if (!amount || Number(amount) <= 0) {
    throw new BadRequestError('A positive payment amount is required.');
  }

  const payment = await prisma.payment.create({
    data: {
      pilot_id: procurement.pilot_id,
      procurement_id: procurementId,
      amount: amount,
      payment_percentage: parseFloat(payment_percentage) || 100,
      status: 'PENDING',
      reference_number: reference_number ? reference_number.trim() : null
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_PAYMENT_SCHEDULED',
    entity_type: 'PAYMENT',
    entity_id: payment.id,
    details: {
      procurement_id: procurementId,
      amount: payment.amount,
      status: 'PENDING'
    },
    ip_address
  });

  return payment;
};

/**
 * List Procurements scoped by Role & Department
 */
export const getProcurements = async (query = {}, user) => {
  const where = {};

  if (user.role === 'GOVERNMENT' && user.department_id) {
    where.department_id = user.department_id;
  } else if (user.role === 'STARTUP') {
    const startup = await prisma.startup.findFirst({ where: { user_id: user.id } });
    if (startup) {
      where.startup_id = startup.id;
    } else {
      return [];
    }
  }

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }
  if (query.route && query.route !== 'ALL') {
    where.route = query.route;
  }
  if (query.pilot_id) {
    where.pilot_id = query.pilot_id;
  }
  if (query.challenge_id) {
    where.challenge_id = query.challenge_id;
  }

  return prisma.procurementRecord.findMany({
    where,
    include: {
      pilot: true,
      challenge: { include: { department: true } },
      startup: true,
      payments: true,
      initiator: { select: { id: true, name: true, role: true } },
      approver: { select: { id: true, name: true, role: true } },
      acceptor: { select: { id: true, name: true, role: true } }
    },
    orderBy: { created_at: 'desc' }
  });
};

/**
 * Get Procurement Record Details by ID
 */
export const getProcurementById = async (id, user) => {
  return verifyProcurementAccess(id, user, 'READ');
};

export default {
  verifyProcurementAccess,
  createProcurementReadiness,
  approveProcurement,
  handoffToGeM,
  issueContract,
  submitDelivery,
  acceptDelivery,
  completeProcurement,
  createProcurementPayment,
  getProcurements,
  getProcurementById
};
