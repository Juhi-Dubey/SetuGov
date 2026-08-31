import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';

export const createEvidence = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has EVIDENCE_MANAGE access to this pilot
  await verifyPilotAccess(pilotId, user, 'EVIDENCE_MANAGE');

  const evidence = await prisma.evidence.create({
    data: {
      pilot_id: pilotId,
      type: data.type.trim(),
      description: data.description.trim(),
      file_url: data.file_url.trim(),
      date: data.date ? new Date(data.date) : new Date(),
      source: data.source.trim(),
      verification_status: 'PENDING',
      uploaded_by: user.id
    },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_EVIDENCE_UPLOADED',
    entity_type: 'EVIDENCE',
    entity_id: evidence.id,
    details: { pilot_id: pilotId, type: evidence.type },
    ip_address
  });

  return evidence;
};

export const getPilotEvidence = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  const evidenceList = await prisma.evidence.findMany({
    where: { pilot_id: pilotId },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { date: 'desc' }
  });

  return evidenceList;
};

export const getEvidenceById = async (id, user = null) => {
  const item = await prisma.evidence.findUnique({
    where: { id },
    include: {
      pilot: true,
      uploader: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!item) {
    throw new NotFoundError(`Evidence item with ID ${id} not found.`);
  }

  if (user) {
    await verifyPilotAccess(item.pilot_id, user, 'READ');
  }

  return item;
};

export const updateEvidence = async (id, data, user, ip_address = null) => {
  const item = await prisma.evidence.findUnique({ where: { id } });
  if (!item) {
    throw new NotFoundError(`Evidence item with ID ${id} not found.`);
  }

  // P0-3: Verify user has EVIDENCE_MANAGE access to parent pilot
  await verifyPilotAccess(item.pilot_id, user, 'EVIDENCE_MANAGE');

  // P1-6: Whitelist allowable update fields
  const allowedFields = ['description', 'verification_status'];
  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
    }
  }

  const updated = await prisma.evidence.update({
    where: { id },
    data: updateData
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_EVIDENCE_UPDATED',
    entity_type: 'EVIDENCE',
    entity_id: id,
    details: { changes: updateData },
    ip_address
  });

  return updated;
};

export default {
  createEvidence,
  getPilotEvidence,
  getEvidenceById,
  updateEvidence
};
