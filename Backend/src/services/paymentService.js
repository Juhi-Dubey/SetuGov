import { prisma } from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';

export const createPayment = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has PAYMENT_MANAGE access to this pilot
  await verifyPilotAccess(pilotId, user, 'PAYMENT_MANAGE');

  // Part 10: Payment must not be created directly with status = PAID
  if (data.status === 'PAID') {
    throw new BadRequestError('Payments cannot be created directly with PAID status. They must follow the approval lifecycle.');
  }

  // Validate milestone relationship if milestone_id is supplied
  if (data.milestone_id) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: data.milestone_id }
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${data.milestone_id} not found.`);
    }

    if (milestone.pilot_id !== pilotId) {
      throw new BadRequestError(`Milestone ${data.milestone_id} belongs to a different pilot project.`);
    }

    // Prevent duplicate active payment schedule for the same milestone
    const existingForMilestone = await prisma.payment.findFirst({
      where: {
        pilot_id: pilotId,
        milestone_id: data.milestone_id,
        status: { not: 'REJECTED' }
      }
    });

    if (existingForMilestone) {
      throw new BadRequestError(`A payment schedule already exists for milestone "${milestone.name}".`);
    }
  }

  const payment = await prisma.$transaction(async (tx) => {
    const newPayment = await tx.payment.create({
      data: {
        pilot_id: pilotId,
        milestone_id: data.milestone_id || null,
        amount: data.amount,
        payment_percentage: data.payment_percentage,
        status: data.status || 'UPCOMING',
        payment_date: null,
        reference_number: data.reference_number ? data.reference_number.trim() : null,
        invoice_url: data.invoice_url ? data.invoice_url.trim() : null
      },
      include: {
        milestone: true
      }
    });

    await tx.auditLog.create({
      data: {
        user_id: user.id,
        action: 'PILOT_PAYMENT_SCHEDULED',
        entity_type: 'PAYMENT',
        entity_id: newPayment.id,
        details: {
          pilot_id: pilotId,
          amount: data.amount,
          status: newPayment.status,
          milestone_id: data.milestone_id
        },
        ip_address
      }
    });

    return newPayment;
  });

  return payment;
};

export const getPilotPayments = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  const payments = await prisma.payment.findMany({
    where: { pilot_id: pilotId },
    include: {
      milestone: {
        select: {
          id: true,
          name: true,
          completion_percentage: true,
          status: true
        }
      }
    },
    orderBy: { created_at: 'asc' }
  });

  return payments;
};

export const getPaymentById = async (id, user = null) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      pilot: true,
      milestone: true
    }
  });

  if (!payment) {
    throw new NotFoundError(`Payment with ID ${id} not found.`);
  }

  if (user) {
    await verifyPilotAccess(payment.pilot_id, user, 'READ');
  }

  return payment;
};

export const updatePaymentStatus = async (id, dataOrStatus, userOrPaymentDate, ipOrUser, ip_address = null) => {
  let status;
  let paymentDate = null;
  let referenceNumber = null;
  let invoiceUrl = null;
  let user;
  let ip = null;

  if (typeof dataOrStatus === 'object' && dataOrStatus !== null) {
    status = dataOrStatus.status;
    paymentDate = dataOrStatus.payment_date || null;
    referenceNumber = dataOrStatus.reference_number || null;
    invoiceUrl = dataOrStatus.invoice_url || null;
    user = userOrPaymentDate;
    ip = ipOrUser || null;
  } else {
    status = dataOrStatus;
    paymentDate = userOrPaymentDate;
    user = ipOrUser;
    ip = ip_address;
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { milestone: true }
  });
  if (!payment) {
    throw new NotFoundError(`Payment with ID ${id} not found.`);
  }

  // P0-3: Verify user has PAYMENT_MANAGE access to parent pilot
  await verifyPilotAccess(payment.pilot_id, user, 'PAYMENT_MANAGE');

  // Prevent duplicate disbursal: already PAID payments cannot be disbursed again or mutated
  if (payment.status === 'PAID') {
    throw new BadRequestError('Payment has already been disbursed (PAID). Duplicate disbursal is rejected.');
  }

  if (payment.status === status) {
    throw new BadRequestError(`Payment is already in '${status}' status.`);
  }

  // Milestone Review & Approval Enforcement before Payment Disbursal
  if (status === 'PAID' && payment.milestone) {
    if (payment.milestone.status !== 'COMPLETED' || (Number(payment.milestone.completion_percentage) || 0) < 100) {
      throw new BadRequestError(
        `Cannot disburse payment (${payment.milestone.payment_percentage}%). Milestone "${payment.milestone.name}" must be reviewed and marked COMPLETED with 100% verified completion first.`
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id },
      data: {
        status,
        payment_date: status === 'PAID' ? (paymentDate ? new Date(paymentDate) : new Date()) : (paymentDate ? new Date(paymentDate) : payment.payment_date),
        reference_number: referenceNumber !== null ? (referenceNumber ? referenceNumber.trim() : null) : payment.reference_number,
        invoice_url: invoiceUrl !== null ? (invoiceUrl ? invoiceUrl.trim() : null) : payment.invoice_url,
        approved_by: user.id
      },
      include: {
        milestone: true
      }
    });

    await tx.auditLog.create({
      data: {
        user_id: user.id,
        action: `PAYMENT_${status}`,
        entity_type: 'PAYMENT',
        entity_id: id,
        details: {
          previousStatus: payment.status,
          newStatus: status,
          amount: payment.amount,
          milestone_id: payment.milestone_id,
          reference_number: updatedPayment.reference_number
        },
        ip_address: ip
      }
    });

    return updatedPayment;
  });

  return updated;
};

export const getPayments = async (query = {}, user = null) => {
  const {
    status,
    pilot_id,
    page = 1,
    limit = 20,
    search
  } = query;

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  const where = {};
  if (status && status !== 'ALL') where.status = status;
  if (pilot_id) where.pilot_id = pilot_id;

  // Role scoping: Government sees payments for pilots in their department; Startup sees their own pilots
  if (user) {
    if (user.role === 'GOVERNMENT') {
      if (!user.department_id) {
        throw new ForbiddenError('Government official must be assigned to a department to list payments.');
      }
      where.pilot = {
        challenge: { department_id: user.department_id }
      };
    } else if (user.role === 'STARTUP') {
      where.pilot = {
        startup: { user_id: user.id }
      };
    } else if (user.role === 'EVALUATOR') {
      where.pilot = {
        challenge: {
          applications: {
            some: {
              evaluator_assignments: {
                some: {
                  evaluator_id: user.id
                }
              }
            }
          }
        }
      };
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim();
    where.OR = [
      { reference_number: { contains: term, mode: 'insensitive' } },
      { pilot: { startup: { company_name: { contains: term, mode: 'insensitive' } } } },
      { pilot: { challenge: { title: { contains: term, mode: 'insensitive' } } } }
    ];
  }

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        milestone: {
          select: {
            id: true,
            name: true,
            completion_percentage: true,
            status: true
          }
        },
        pilot: {
          select: {
            id: true,
            status: true,
            location: true,
            budget: true,
            challenge: {
              select: {
                id: true,
                title: true,
                department: true
              }
            },
            startup: {
              select: {
                id: true,
                company_name: true
              }
            }
          }
        }
      }
    })
  ]);

  return {
    payments,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

export default {
  createPayment,
  getPilotPayments,
  getPayments,
  getPaymentById,
  updatePaymentStatus
};
