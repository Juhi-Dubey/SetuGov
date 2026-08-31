import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';

export const createPayment = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has PAYMENT_MANAGE access to this pilot
  await verifyPilotAccess(pilotId, user, 'PAYMENT_MANAGE');

  const payment = await prisma.payment.create({
    data: {
      pilot_id: pilotId,
      milestone_id: data.milestone_id || null,
      amount: data.amount,
      payment_percentage: data.payment_percentage,
      status: data.status || 'UPCOMING',
      payment_date: data.payment_date ? new Date(data.payment_date) : null
    },
    include: {
      milestone: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_PAYMENT_SCHEDULED',
    entity_type: 'PAYMENT',
    entity_id: payment.id,
    details: { pilot_id: pilotId, amount: data.amount, status: payment.status },
    ip_address
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

export const updatePaymentStatus = async (id, status, paymentDate = null, user, ip_address = null) => {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) {
    throw new NotFoundError(`Payment with ID ${id} not found.`);
  }

  // P0-3: Verify user has PAYMENT_MANAGE access to parent pilot
  await verifyPilotAccess(payment.pilot_id, user, 'PAYMENT_MANAGE');

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status,
      payment_date: status === 'PAID' ? (paymentDate ? new Date(paymentDate) : new Date()) : payment.payment_date
    },
    include: {
      milestone: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: `PAYMENT_${status}`,
    entity_type: 'PAYMENT',
    entity_id: id,
    details: { previousStatus: payment.status, newStatus: status, amount: payment.amount },
    ip_address
  });

  return updated;
};

export default {
  createPayment,
  getPilotPayments,
  getPaymentById,
  updatePaymentStatus
};
