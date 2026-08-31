import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';

export const createMilestone = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has MILESTONE_MANAGE access to this pilot
  await verifyPilotAccess(pilotId, user, 'MILESTONE_MANAGE');

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

export const getPilotMilestones = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
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

export const getMilestoneById = async (id, user = null) => {
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

  if (user) {
    await verifyPilotAccess(milestone.pilot_id, user, 'READ');
  }

  return milestone;
};

export const updateMilestone = async (id, data, user, ip_address = null) => {
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) {
    throw new NotFoundError(`Milestone with ID ${id} not found.`);
  }

  // P0-3: Verify user has MILESTONE_MANAGE access to parent pilot
  await verifyPilotAccess(milestone.pilot_id, user, 'MILESTONE_MANAGE');

  // P1-6: Whitelist allowable update fields
  const allowedFields = [
    'name',
    'description',
    'due_date',
    'completion_percentage',
    'payment_percentage',
    'evidence_url'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'due_date') {
        updateData.due_date = new Date(data.due_date);
      } else if (typeof data[field] === 'string') {
        updateData[field] = data[field].trim();
      } else {
        updateData[field] = data[field];
      }
    }
  }

  if (updateData.completion_percentage === 100) {
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
    details: { changes: updateData },
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
