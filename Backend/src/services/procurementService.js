import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';
import storageService from './storageService.js';

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
      acceptor: { select: { id: true, name: true, email: true, role: true } },
      contract_acceptor: { select: { id: true, name: true, email: true, role: true } }
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

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.procurementRecord.update({
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
      tx,
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

    return res;
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

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.procurementRecord.update({
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
      tx,
      user_id: user.id,
      action: 'PROCUREMENT_GEM_HANDOFF_RECORDED',
      entity_type: 'PROCUREMENT',
      entity_id: procurementId,
      details: {
        gem_reference_number: res.gem_reference_number,
        officer: res.gem_officer_name,
        handoff_status: res.gem_handoff_status
      },
      ip_address
    });

    return res;
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

  // Q2: Allow re-issuance from CONTRACT_DECLINED directly
  if (!['APPROVED', 'HANDED_OFF', 'CONTRACT_DECLINED'].includes(procurement.status)) {
    throw new BadRequestError(`Cannot issue contract for procurement in "${procurement.status}" status. Must be APPROVED, HANDED_OFF, or CONTRACT_DECLINED.`);
  }

  const {
    po_reference_number,
    contract_reference,
    contract_document_url,
    final_contract_value,
    contract_effective_date,
    contract_duration_days,
    contract_draft_content
  } = data;

  if (!contract_reference && !po_reference_number) {
    throw new BadRequestError('Either a Contract Reference Number or PO Reference Number is required.');
  }

  let cleanContractDocUrl = contract_document_url ? contract_document_url.trim() : null;
  if (cleanContractDocUrl && (cleanContractDocUrl.startsWith('/api/v1/documents/') || cleanContractDocUrl.startsWith('/uploads/') || cleanContractDocUrl.includes('localhost') || cleanContractDocUrl.includes('setugov.in'))) {
    const verified = await storageService.verifyDocumentFile(cleanContractDocUrl);
    cleanContractDocUrl = verified.normalizedUrl;
  }

  const wasDeclined = procurement.status === 'CONTRACT_DECLINED';

  const updatePayload = {
    status: 'CONTRACT_ISSUED',
    po_reference_number: po_reference_number ? po_reference_number.trim() : null,
    contract_reference: contract_reference ? contract_reference.trim() : null,
    contract_document_url: cleanContractDocUrl,
    final_contract_value: final_contract_value !== undefined ? final_contract_value : procurement.estimated_value,
    contract_issued_at: new Date(),
    contract_effective_date: contract_effective_date ? new Date(contract_effective_date) : new Date(),
    contract_duration_days: parseInt(contract_duration_days, 10) || 90,
    // Reset acceptance and decline fields on re-issuance
    contract_accepted_at: null,
    contract_accepted_by: null,
    contract_decline_notes: null
  };

  if (contract_draft_content !== undefined) {
    updatePayload.contract_draft_content = contract_draft_content;
  }

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: updatePayload
  });

  await createAuditLog({
    user_id: user.id,
    action: wasDeclined ? 'PROCUREMENT_CONTRACT_REISSUED' : 'PROCUREMENT_CONTRACT_ISSUED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      contract_reference: updated.contract_reference,
      po_reference_number: updated.po_reference_number,
      final_contract_value: updated.final_contract_value,
      reissued_after_decline: wasDeclined
    },
    ip_address
  });

  // Notify startup user that contract has been issued / reissued
  if (procurement.startup?.user_id) {
    await sendNotification({
      user_id: procurement.startup.user_id,
      title: wasDeclined ? 'Revised Contract Issued' : 'Contract Issued — Action Required',
      message: wasDeclined
        ? `The government has re-issued a revised contract for "${procurement.challenge?.title || 'Challenge'}". Please review and accept or decline.`
        : `Official contract ${updated.contract_reference || updated.po_reference_number} has been issued for "${procurement.challenge?.title || 'Challenge'}". Please review and accept to proceed to delivery.`,
      type: 'CONTRACT_ISSUED',
      link: '/startup/pilots'
    });
  }

  return updated;
};

/**
 * C3a: Generate automated contract draft synthesising challenge, startup, and pilot outcomes
 */
export const generateContractDraft = async (procurementId, user, ip_address = null) => {
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can generate contract drafts.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'GENERATE_DRAFT');

  if (!['APPROVED', 'HANDED_OFF', 'CONTRACT_ISSUED', 'CONTRACT_DECLINED'].includes(procurement.status)) {
    throw new BadRequestError(`Cannot generate contract draft for procurement in "${procurement.status}" status. Must be APPROVED, HANDED_OFF, CONTRACT_ISSUED, or CONTRACT_DECLINED.`);
  }

  // 1. Challenge with department & creator
  const challenge = await prisma.challenge.findUnique({
    where: { id: procurement.challenge_id },
    include: {
      department: true,
      creator: { select: { id: true, name: true, email: true, designation: true } }
    }
  });

  // 2. Startup with bank_details, user, and verified documents
  const startup = await prisma.startup.findUnique({
    where: { id: procurement.startup_id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      bank_details: true,
      documents: { where: { verification_status: 'VERIFIED' } }
    }
  });

  // 3. Pilot with validation, scale decision, milestones
  const pilot = await prisma.pilot.findUnique({
    where: { id: procurement.pilot_id },
    include: {
      validations: true,
      scale_decisions: { orderBy: { created_at: 'desc' }, take: 1 },
      milestones: true,
      progress_updates: { orderBy: { created_at: 'desc' }, take: 5 }
    }
  });

  // 4. Winning application for proposal details
  const application = await prisma.application.findFirst({
    where: {
      challenge_id: procurement.challenge_id,
      startup_id: procurement.startup_id,
      status: 'SELECTED'
    },
    include: {
      evaluations: { where: { is_submitted: true } }
    }
  });

  const latestScaleDecision = pilot?.scale_decisions?.[0] || null;
  const latestValidation = pilot?.validations?.[0] || null;
  const effectiveValue = Number(procurement.final_contract_value || procurement.estimated_value || 0);

  const draft = {
    contract_title: `Commercial Procurement Agreement: ${challenge?.title || 'Challenge Procurement'}`,
    draft_id: `DRAFT-${procurement.id.slice(0, 8).toUpperCase()}`,
    generated_at: new Date().toISOString(),
    status: procurement.status,
    parties: {
      buyer: {
        department_name: challenge?.department?.name || 'Government Department',
        state: challenge?.department?.state || 'India',
        nodal_officer: challenge?.department?.nodal_officer_name || challenge?.creator?.name || 'Nodal Officer',
        nodal_designation: challenge?.department?.nodal_officer_designation || challenge?.creator?.designation || 'Authorized Representative',
        contact_email: challenge?.department?.contact_email || challenge?.creator?.email || ''
      },
      supplier: {
        company_name: startup?.company_name || 'Startup',
        org_type: startup?.org_type || 'PRIVATE_LIMITED',
        dpiit_recognition: startup?.dpiit_number ? `DPIIT Recognized (${startup.dpiit_number})` : 'Recognized Startup',
        pan_number: startup?.pan_number || 'N/A',
        registered_address: `${startup?.registered_address || ''}, ${startup?.city || ''}, ${startup?.state || ''} - ${startup?.pincode || ''}`,
        authorized_signatory: startup?.authorized_person_name || startup?.user?.name || '',
        authorized_email: startup?.authorized_person_email || startup?.user?.email || '',
        bank_details: startup?.bank_details ? {
          account_holder: startup.bank_details.account_holder_name || startup.company_name,
          account_number_masked: startup.bank_details.account_number ? `XXXX${startup.bank_details.account_number.slice(-4)}` : null,
          ifsc_code: startup.bank_details.ifsc_code,
          bank_name: startup.bank_details.bank_name
        } : null
      }
    },
    scope_of_work: {
      challenge_id: challenge?.id,
      challenge_title: challenge?.title,
      problem_statement: challenge?.problem_description,
      desired_outcomes: challenge?.desired_outcome,
      pilot_location: challenge?.pilot_location || challenge?.location || 'Pan-India',
      kpis: challenge?.kpis || [],
      milestones: challenge?.milestones || []
    },
    pilot_outcome_summary: {
      pilot_id: pilot?.id,
      pilot_duration_days: pilot?.duration_days,
      validation_status: latestValidation?.status || 'VALIDATED',
      validation_score: latestValidation?.overall_score || latestValidation?.performance_score || pilot?.overall_score || 100,
      scale_decision: latestScaleDecision?.decision || 'SCALE',
      scale_justification: latestScaleDecision?.reasoning || latestScaleDecision?.justification || procurement.justification
    },
    proposal_summary: {
      application_id: application?.id,
      technical_approach: application?.technical_approach || 'As per approved pilot deliverables',
      expected_impact: application?.expected_impact || '',
      estimated_cost: application?.estimated_cost ? Number(application.estimated_cost) : null
    },
    financial_terms: {
      route: procurement.route,
      estimated_value: Number(procurement.estimated_value),
      final_contract_value: effectiveValue,
      currency: 'INR',
      payment_schedule: 'Milestone / Deliverable-based upon formal acceptance of delivery and verification by Nodal Officer',
      contract_duration_days: procurement.contract_duration_days || 90
    },
    governing_terms: [
      '1. Compliance: The Supplier agrees to deliver the technological solution adhering to all data protection, confidentiality, and cybersecurity standards specified during the pilot phase.',
      '2. IP Ownership: Intellectual Property created specifically under this contract shall remain governed by the Problem Statement IP terms (' + (challenge?.ip_ownership || 'STARTUP_OWNED') + ').',
      '3. Delivery & Acceptance: Solutions must be delivered on or before the contractual deadline. Final payment is contingent upon formal written Government acceptance.',
      '4. Statutory Adherence: Both parties agree to abide by the General Financial Rules (GFR) and applicable procurement norms of the Government of India.'
    ]
  };

  const markdown = `
# Commercial Procurement Agreement Draft
**Reference**: ${draft.draft_id} | **Date**: ${new Date().toLocaleDateString('en-IN')}

## 1. Contracting Parties
- **Procuring Entity**: ${draft.parties.buyer.department_name}, ${draft.parties.buyer.state} (Represented by ${draft.parties.buyer.nodal_officer}, ${draft.parties.buyer.nodal_designation})
- **Contractor / Startup**: ${draft.parties.supplier.company_name} (PAN: ${draft.parties.supplier.pan_number || 'N/A'}, DPIIT: ${draft.parties.supplier.dpiit_recognition})
  - **Authorized Signatory**: ${draft.parties.supplier.authorized_signatory} (${draft.parties.supplier.authorized_email})
  - **Registered Address**: ${draft.parties.supplier.registered_address}

## 2. Solution Scope & Problem Statement
- **Problem Statement**: ${draft.scope_of_work.challenge_title}
- **Deliverables**: ${draft.scope_of_work.desired_outcomes}
- **Deployment Location**: ${draft.scope_of_work.pilot_location}

## 3. Preceding Pilot & Validation Results
- **Validation Status**: ${draft.pilot_outcome_summary.validation_status} (Score: ${draft.pilot_outcome_summary.validation_score})
- **Scale Decision**: ${draft.pilot_outcome_summary.scale_decision}
- **Justification**: ${draft.pilot_outcome_summary.scale_justification}

## 4. Financial & Commercial Terms
- **Procurement Route**: ${draft.financial_terms.route}
- **Total Contract Value**: ₹${effectiveValue.toLocaleString('en-IN')}
- **Term / Duration**: ${draft.financial_terms.contract_duration_days} days from effective issuance
- **Payment Structure**: ${draft.financial_terms.payment_schedule}

## 5. Standard Government Terms
${draft.governing_terms.join('\n')}
`.trim();

  await createAuditLog({
    user_id: user.id,
    action: 'CONTRACT_DRAFT_GENERATED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      draft_id: draft.draft_id,
      final_contract_value: effectiveValue,
      startup_id: procurement.startup_id,
      challenge_id: procurement.challenge_id
    },
    ip_address
  });

  return {
    draft,
    markdown,
    suggested_form_values: {
      final_contract_value: effectiveValue,
      contract_duration_days: procurement.contract_duration_days || 90,
      contract_effective_date: new Date().toISOString().split('T')[0],
      contract_reference: `CTR/${challenge?.department?.department_code || 'GOV'}/${new Date().getFullYear()}/${procurementId.slice(0, 6).toUpperCase()}`
    }
  };
};

/**
 * C3b: Startup officially accepts the issued contract
 */
export const acceptContract = async (procurementId, user, ip_address = null) => {
  if (user.role !== 'STARTUP') {
    throw new ForbiddenError('Only the contracted startup can accept the procurement contract.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'STARTUP_ACCEPT_CONTRACT');

  if (procurement.status !== 'CONTRACT_ISSUED') {
    throw new BadRequestError(`Cannot accept contract: procurement is in "${procurement.status}" status. Contract must be in CONTRACT_ISSUED status.`);
  }

  if (procurement.startup.user_id !== user.id) {
    throw new ForbiddenError('You can only accept contracts issued to your startup.');
  }

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: 'CONTRACT_ACCEPTED',
      contract_accepted_at: new Date(),
      contract_accepted_by: user.id
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_CONTRACT_ACCEPTED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      contract_reference: procurement.contract_reference,
      po_reference_number: procurement.po_reference_number,
      startup_id: procurement.startup_id,
      startup_user_id: user.id
    },
    ip_address
  });

  const notifyUser = procurement.challenge?.created_by || procurement.initiated_by;
  if (notifyUser) {
    await sendNotification({
      user_id: notifyUser,
      title: 'Contract Accepted by Startup',
      message: `Startup "${procurement.startup.company_name}" has officially accepted contract ${procurement.contract_reference || procurement.po_reference_number || ''} for challenge "${procurement.challenge?.title}".`,
      type: 'CONTRACT_ACCEPTED',
      link: `/government/challenges/${procurement.challenge_id}/contract`
    });
  }

  return updated;
};

/**
 * C3b: Startup officially declines the issued contract with revision notes
 */
export const declineContract = async (procurementId, data, user, ip_address = null) => {
  if (user.role !== 'STARTUP') {
    throw new ForbiddenError('Only the contracted startup can decline the procurement contract.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'STARTUP_DECLINE_CONTRACT');

  if (procurement.status !== 'CONTRACT_ISSUED') {
    throw new BadRequestError(`Cannot decline contract: procurement is in "${procurement.status}" status. Contract must be in CONTRACT_ISSUED status.`);
  }

  if (procurement.startup.user_id !== user.id) {
    throw new ForbiddenError('You can only decline contracts issued to your startup.');
  }

  const { decline_notes } = data || {};
  if (!decline_notes || !decline_notes.trim()) {
    throw new BadRequestError('Decline notes are mandatory when declining a contract. Please explain what terms or items need revision.');
  }

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: 'CONTRACT_DECLINED',
      contract_decline_notes: decline_notes.trim()
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PROCUREMENT_CONTRACT_DECLINED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    details: {
      contract_reference: procurement.contract_reference,
      po_reference_number: procurement.po_reference_number,
      startup_id: procurement.startup_id,
      decline_notes: decline_notes.trim()
    },
    ip_address
  });

  const notifyUser = procurement.challenge?.created_by || procurement.initiated_by;
  if (notifyUser) {
    await sendNotification({
      user_id: notifyUser,
      title: 'Contract Declined by Startup',
      message: `Startup "${procurement.startup.company_name}" declined contract ${procurement.contract_reference || procurement.po_reference_number || ''} for challenge "${procurement.challenge?.title}". Reason: ${decline_notes.trim()}`,
      type: 'CONTRACT_DECLINED',
      link: `/government/challenges/${procurement.challenge_id}/contract`
    });
  }

  return updated;
};

/**
 * 5. Startup Solution Delivery Submission
 */
export const submitDelivery = async (procurementId, data, user, ip_address = null) => {
  const procurement = await verifyProcurementAccess(procurementId, user, 'SUBMIT_DELIVERY');

  // C3b: Strict acceptance gate before delivery submission
  if (procurement.status !== 'CONTRACT_ACCEPTED') {
    throw new BadRequestError(`Cannot submit delivery for procurement in "${procurement.status}" status. The startup must explicitly accept the contract before submitting delivery.`);
  }

  const { delivery_scope, delivery_evidence_url, delivery_notes = '' } = data;

  if (!delivery_scope) {
    throw new BadRequestError('Detailed delivery scope description is required.');
  }

  let cleanDeliveryEvidenceUrl = delivery_evidence_url ? delivery_evidence_url.trim() : null;
  if (cleanDeliveryEvidenceUrl && (cleanDeliveryEvidenceUrl.startsWith('/api/v1/documents/') || cleanDeliveryEvidenceUrl.startsWith('/uploads/') || cleanDeliveryEvidenceUrl.includes('localhost') || cleanDeliveryEvidenceUrl.includes('setugov.in'))) {
    const verified = await storageService.verifyDocumentFile(cleanDeliveryEvidenceUrl);
    cleanDeliveryEvidenceUrl = verified.normalizedUrl;
  }

  const updated = await prisma.procurementRecord.update({
    where: { id: procurementId },
    data: {
      status: 'DELIVERY_SUBMITTED',
      delivery_date: new Date(),
      delivery_scope: delivery_scope.trim(),
      delivery_evidence_url: cleanDeliveryEvidenceUrl,
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

  // Part 10: Payment must not be created directly with status = PAID
  if (data.status === 'PAID') {
    throw new BadRequestError('Payments cannot be created directly with PAID status. They must follow the approval lifecycle.');
  }

  const procurement = await verifyProcurementAccess(procurementId, user, 'CREATE_PAYMENT');

  if (procurement.acceptance_status !== 'ACCEPTED') {
    throw new BadRequestError('Payment is not eligible until formal government delivery acceptance is recorded.');
  }

  // Duplicate protection for the same procurement obligation
  const existingProcurementPayment = await prisma.payment.findFirst({
    where: {
      procurement_id: procurementId,
      status: { not: 'REJECTED' }
    }
  });

  if (existingProcurementPayment) {
    throw new BadRequestError('A payment schedule already exists for this procurement record.');
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
      status: data.status || 'PENDING',
      reference_number: reference_number ? reference_number.trim() : null
    },
    include: {
      procurement: true,
      pilot: true
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
      status: payment.status
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
  generateContractDraft,
  acceptContract,
  declineContract,
  submitDelivery,
  acceptDelivery,
  completeProcurement,
  createProcurementPayment,
  getProcurements,
  getProcurementById
};
