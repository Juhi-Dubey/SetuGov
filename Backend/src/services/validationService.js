import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';

export const createValidation = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has VALIDATION_MANAGE access to this pilot
  const pilot = await verifyPilotAccess(pilotId, user, 'VALIDATION_MANAGE');

  // P2-9: Canonical lifecycle transition verification
  // Derive allowed state transitions strictly from the canonical state machine in lifecycle.js
  if (pilot.status !== 'VALIDATION') {
    validateTransition('PILOT', pilot.status, 'VALIDATION');
  }

  const validation = await prisma.validation.create({
    data: {
      pilot_id: pilotId,
      validator_id: user.id,
      performance_score: data.performance_score,
      kpi_achievement_score: data.kpi_achievement_score,
      evidence_quality_score: data.evidence_quality_score,
      technical_stability_score: data.technical_stability_score,
      user_satisfaction_score: data.user_satisfaction_score,
      comments: data.comments?.trim() || null,
      status: data.status || 'VALIDATED'
    },
    include: {
      validator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  // Calculate combined overall validation score
  const overallValidationScore = parseFloat((
    (data.performance_score * 0.25 +
     data.kpi_achievement_score * 0.25 +
     data.evidence_quality_score * 0.20 +
     data.technical_stability_score * 0.15 +
     data.user_satisfaction_score * 0.15)
  ).toFixed(2));

  await prisma.pilot.update({
    where: { id: pilotId },
    data: {
      status: 'VALIDATION',
      overall_score: overallValidationScore
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_VALIDATION_SUBMITTED',
    entity_type: 'VALIDATION',
    entity_id: validation.id,
    details: { pilot_id: pilotId, status: validation.status, overallScore: overallValidationScore },
    ip_address
  });

  return validation;
};

export const getPilotValidations = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  const validations = await prisma.validation.findMany({
    where: { pilot_id: pilotId },
    include: {
      validator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  return validations;
};

export const updateValidation = async (id, data, user, ip_address = null) => {
  const validation = await prisma.validation.findUnique({ where: { id } });
  if (!validation) {
    throw new NotFoundError(`Validation report with ID ${id} not found.`);
  }

  // P0-3: Verify user has VALIDATION_MANAGE access to parent pilot
  await verifyPilotAccess(validation.pilot_id, user, 'VALIDATION_MANAGE');

  // P1-6: Whitelist allowable update fields
  const allowedFields = [
    'performance_score',
    'kpi_achievement_score',
    'evidence_quality_score',
    'technical_stability_score',
    'user_satisfaction_score',
    'comments',
    'status'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
    }
  }

  const updated = await prisma.validation.update({
    where: { id },
    data: updateData,
    include: {
      validator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_VALIDATION_UPDATED',
    entity_type: 'VALIDATION',
    entity_id: id,
    details: { changes: updateData },
    ip_address
  });

  return updated;
};

export default {
  createValidation,
  getPilotValidations,
  updateValidation
};
