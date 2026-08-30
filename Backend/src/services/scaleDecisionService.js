import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { createAuditLog } from './auditService.js';

export const createScaleDecision = async (pilotId, data, user, ip_address = null) => {
  // Only GOVERNMENT or ADMIN role can make final scale decisions
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only authorized Government officials or Administrators can finalize pilot scale decisions.');
  }

  const pilot = await prisma.pilot.findUnique({
    where: { id: pilotId },
    include: { challenge: true, startup: true }
  });

  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  // Determine target pilot lifecycle state
  let targetPilotStatus;
  if (data.decision === 'SCALE') {
    targetPilotStatus = 'SCALED';
  } else if (data.decision === 'EXTEND') {
    targetPilotStatus = 'EXTENDED';
  } else if (data.decision === 'STOP') {
    targetPilotStatus = 'STOPPED';
  } else {
    throw new BadRequestError(`Invalid decision type: ${data.decision}`);
  }

  // Validate state transition
  validateTransition('PILOT', pilot.status, targetPilotStatus);

  // Perform transaction to record decision and update pilot + challenge status
  const [scaleDecision] = await prisma.$transaction([
    prisma.scaleDecision.create({
      data: {
        pilot_id: pilotId,
        decision: data.decision,
        score: data.score !== undefined ? data.score : pilot.overall_score,
        reasoning: data.reasoning.trim(),
        approved_by: user.id,
        decision_date: new Date(),
        status: 'FINALIZED'
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    }),
    prisma.pilot.update({
      where: { id: pilotId },
      data: {
        status: targetPilotStatus,
        final_recommendation: data.reasoning.trim()
      }
    }),
    prisma.challenge.update({
      where: { id: pilot.challenge_id },
      data: {
        status: targetPilotStatus === 'SCALED' || targetPilotStatus === 'STOPPED' ? 'COMPLETED' : pilot.challenge.status
      }
    })
  ]);

  await createAuditLog({
    user_id: user.id,
    action: `SCALE_DECISION_${data.decision}`,
    entity_type: 'PILOT',
    entity_id: pilotId,
    details: {
      decision: data.decision,
      score: scaleDecision.score,
      reasoning: data.reasoning,
      pilot_status: targetPilotStatus
    },
    ip_address
  });

  return scaleDecision;
};

export const getScaleDecision = async (pilotId) => {
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  const decision = await prisma.scaleDecision.findFirst({
    where: { pilot_id: pilotId },
    orderBy: { created_at: 'desc' },
    include: {
      approver: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return decision;
};

export default {
  createScaleDecision,
  getScaleDecision
};
