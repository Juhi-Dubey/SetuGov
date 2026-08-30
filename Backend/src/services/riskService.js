import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

export const createRisk = async (pilotId, data, user, ip_address = null) => {
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  const risk = await prisma.risk.create({
    data: {
      pilot_id: pilotId,
      category: data.category,
      description: data.description.trim(),
      severity: data.severity,
      mitigation: data.mitigation.trim(),
      owner: data.owner.trim(),
      due_date: data.due_date ? new Date(data.due_date) : null,
      status: 'IDENTIFIED'
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_RISK_LOGGED',
    entity_type: 'RISK',
    entity_id: risk.id,
    details: { pilot_id: pilotId, category: risk.category, severity: risk.severity },
    ip_address
  });

  return risk;
};

export const getPilotRisks = async (pilotId) => {
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  const risks = await prisma.risk.findMany({
    where: { pilot_id: pilotId },
    orderBy: { created_at: 'desc' }
  });

  return risks;
};

export const getRiskById = async (id) => {
  const risk = await prisma.risk.findUnique({
    where: { id },
    include: { pilot: true }
  });

  if (!risk) {
    throw new NotFoundError(`Risk with ID ${id} not found.`);
  }

  return risk;
};

export const updateRisk = async (id, data, user, ip_address = null) => {
  const risk = await prisma.risk.findUnique({ where: { id } });
  if (!risk) {
    throw new NotFoundError(`Risk with ID ${id} not found.`);
  }

  const updateData = { ...data };
  if (data.due_date) updateData.due_date = new Date(data.due_date);

  const updated = await prisma.risk.update({
    where: { id },
    data: updateData
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_RISK_UPDATED',
    entity_type: 'RISK',
    entity_id: id,
    details: { changes: data },
    ip_address
  });

  return updated;
};

export default {
  createRisk,
  getPilotRisks,
  getRiskById,
  updateRisk
};
