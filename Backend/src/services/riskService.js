import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';

export const createRisk = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has RISK_MANAGE access to this pilot
  await verifyPilotAccess(pilotId, user, 'RISK_MANAGE');

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

export const getPilotRisks = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  const risks = await prisma.risk.findMany({
    where: { pilot_id: pilotId },
    orderBy: { created_at: 'desc' }
  });

  return risks;
};

export const getRiskById = async (id, user = null) => {
  const risk = await prisma.risk.findUnique({
    where: { id },
    include: { pilot: true }
  });

  if (!risk) {
    throw new NotFoundError(`Risk with ID ${id} not found.`);
  }

  if (user) {
    await verifyPilotAccess(risk.pilot_id, user, 'READ');
  }

  return risk;
};

export const updateRisk = async (id, data, user, ip_address = null) => {
  const risk = await prisma.risk.findUnique({ where: { id } });
  if (!risk) {
    throw new NotFoundError(`Risk with ID ${id} not found.`);
  }

  // P0-3: Verify user has RISK_MANAGE access to parent pilot
  await verifyPilotAccess(risk.pilot_id, user, 'RISK_MANAGE');

  // P1-6: Whitelist allowable update fields
  const allowedFields = [
    'category',
    'description',
    'severity',
    'mitigation',
    'owner',
    'due_date',
    'status'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'due_date') {
        updateData.due_date = data[field] ? new Date(data[field]) : null;
      } else if (typeof data[field] === 'string') {
        updateData[field] = data[field].trim();
      } else {
        updateData[field] = data[field];
      }
    }
  }

  const updated = await prisma.risk.update({
    where: { id },
    data: updateData
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_RISK_UPDATED',
    entity_type: 'RISK',
    entity_id: id,
    details: { changes: updateData },
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
