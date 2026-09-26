import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';
import storageService from './storageService.js';
import { extractTextFromBuffer } from '../utils/textExtraction.js';

export const createEvidence = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has EVIDENCE_MANAGE access to this pilot
  await verifyPilotAccess(pilotId, user, 'EVIDENCE_MANAGE');

  if (!data.file_url) {
    throw new BadRequestError('Evidence file URL is required.');
  }

  // Verify physical document existence in storage and sanitize reference
  const verified = await storageService.verifyDocumentFile(data.file_url);

  // Extract text content so AI pilot analysis (Brain 4) can read the actual
  // evidence document instead of only its description/source metadata.
  // Best-effort: never blocks the upload.
  let extracted_text = null;
  let extraction_status = 'PENDING';
  try {
    if (verified.key) {
      const filePathOnDisk = path.join(storageService.getLocalStorageDir(), verified.key);
      if (fs.existsSync(filePathOnDisk)) {
        const buffer = fs.readFileSync(filePathOnDisk);
        const mimeType = verified.metadata?.mimeType || '';
        const result = await extractTextFromBuffer(buffer, mimeType, verified.key);
        extracted_text = result.text;
        extraction_status = result.status;
      } else {
        extraction_status = 'FAILED';
      }
    } else {
      extraction_status = 'UNSUPPORTED_TYPE';
    }
  } catch (extractErr) {
    extraction_status = 'FAILED';
  }

  let evidence;
  try {
    evidence = await prisma.evidence.create({
      data: {
        pilot_id: pilotId,
        type: data.type.trim(),
        description: data.description.trim(),
        file_url: verified.normalizedUrl,
        date: data.date ? new Date(data.date) : new Date(),
        source: data.source.trim(),
        verification_status: 'PENDING',
        extracted_text,
        extraction_status,
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
  } catch (dbErr) {
    if (verified.key) {
      await storageService.deleteFile(verified.key).catch(() => null);
    }
    throw dbErr;
  }

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

  // Part 9: Startup must NOT be able to mark its own evidence as VERIFIED or change verification status
  if (user.role === 'STARTUP') {
    delete updateData.verification_status;
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
