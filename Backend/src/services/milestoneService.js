import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

export const createMilestone = async (pilotId, data, user, ip_address = null) => {
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  const milestone = await prisma.milestone.create({
    data: {
      pilot_id: pilotId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      due_date: new Date(data.due_date),
      completion_percentage: data.completion_percentage || 0,
      payment_percentage: data.payment_percentage || 0,
      evidence_url: data.evidence_url || null,
      status: data.completion_percentage === 100 ? 'COMPLETED' : 'PENDING'
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_MILESTONE_CREATED',
    entity_type: 'MILESTONE',
    entity_id: milestone.id,
    details: { pilot_id: pilotId, name: milestone.name },
    ip_address
  });

  return milestone;
};

export const getPilotMilestones = async (pilotId) => {
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  const milestones = await prisma.milestone.findMany({
    where: { pilot_id: pilotId },
    include: {
      payments: true
    },
    orderBy: { due_date: 'asc' }
  });

  return milestones;
};

export const getMilestoneById = async (id) => {
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: {
      pilot: true,
      payments: true
    }
  });

  if (!milestone) {
    throw new NotFoundError(`Milestone with ID ${id} not found.`);
  }

  return milestone;
};

export const updateMilestone = async (id, data, user, ip_address = null) => {
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) {
    throw new NotFoundError(`Milestone with ID ${id} not found.`);
  }

  const updateData = { ...data };
  if (data.due_date) updateData.due_date = new Date(data.due_date);
  if (data.completion_percentage === 100 && !data.status) {
    updateData.status = 'COMPLETED';
  }

  const updated = await prisma.milestone.update({
    where: { id },
    data: updateData
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_MILESTONE_UPDATED',
    entity_type: 'MILESTONE',
    entity_id: id,
    details: { changes: data },
    ip_address
  });

  return updated;
};

export default {
  createMilestone,
  getPilotMilestones,
  getMilestoneById,
  updateMilestone
};
