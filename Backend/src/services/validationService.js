import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

export const createValidation = async (pilotId, data, user, ip_address = null) => {
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
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

  // If pilot is RUNNING, transition to VALIDATION state
  await prisma.pilot.update({
    where: { id: pilotId },
    data: {
      status: pilot.status === 'RUNNING' || pilot.status === 'AT_RISK' ? 'VALIDATION' : pilot.status,
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

export const getPilotValidations = async (pilotId) => {
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
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

  const updated = await prisma.validation.update({
    where: { id },
    data,
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
    details: { changes: data },
    ip_address
  });

  return updated;
};

export default {
  createValidation,
  getPilotValidations,
  updateValidation
};
