import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';
import { sendNotification, notifyScaleDecision } from './notificationService.js';

export const createScaleDecision = async (pilotId, data, user, ip_address = null) => {
  // Only GOVERNMENT or ADMIN role can make final scale decisions
  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only authorized Government officials or Administrators can finalize pilot scale decisions.');
  }

  // P0-3: Verify tenant authorization for the pilot project
  // P0-3: Verify tenant authorization for the pilot project
  const pilot = await verifyPilotAccess(pilotId, user, 'SCALE_DECISION');

  // Governance Gate: Pilot must have reached VALIDATION stage with an existing validation record
  const validationRecord = await prisma.validation.findFirst({
    where: { pilot_id: pilotId },
    orderBy: { created_at: 'desc' }
  });

  if (!validationRecord) {
    throw new BadRequestError(
      'Cannot finalize scale decision: Pilot project has not been validated. An authoritative independent evaluation report is required before a scale decision can be made.'
    );
  }

  if (data.decision === 'SCALE' && validationRecord.status === 'NOT_VALIDATED') {
    throw new BadRequestError(
      'Cannot scale pilot: Pilot project is NOT_VALIDATED. A pilot that failed validation cannot proceed to commercial scale.'
    );
  }

  // Prevent duplicate competing finalized decisions unless the lifecycle explicitly permits another decision after EXTEND
  const existingFinalized = await prisma.scaleDecision.findFirst({
    where: { pilot_id: pilotId, status: 'FINALIZED' }
  });

  if (existingFinalized && pilot.status !== 'EXTENDED') {
    throw new BadRequestError('A finalized scale decision has already been recorded for this pilot project.');
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

  // Perform transaction to record decision, audit log, and update pilot + challenge status
  const [scaleDecision] = await prisma.$transaction(async (tx) => {
    const dec = await tx.scaleDecision.create({
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
    });

    await tx.pilot.update({
      where: { id: pilotId },
      data: {
        status: targetPilotStatus,
        final_recommendation: data.reasoning.trim()
      }
    });

    await tx.challenge.update({
      where: { id: pilot.challenge_id },
      data: {
        status: targetPilotStatus === 'SCALED' || targetPilotStatus === 'STOPPED' ? 'COMPLETED' : pilot.challenge.status
      }
    });

    await createAuditLog({
      tx,
      user_id: user.id,
      action: `SCALE_DECISION_${data.decision}`,
      entity_type: 'PILOT',
      entity_id: pilotId,
      details: {
        decision: data.decision,
        score: dec.score,
        reasoning: data.reasoning,
        pilot_status: targetPilotStatus
      },
      ip_address
    });

    return [dec];
  });

  // Dispatch in-app notification and transactional email with duplicate protection
  await notifyScaleDecision({
    pilotId,
    scaleDecisionId: scaleDecision.id,
    decision: data.decision,
    reasoning: data.reasoning,
    startupId: pilot.startup?.id || pilot.startup_id,
    challengeTitle: pilot.challenge?.title,
    startupName: pilot.startup?.company_name
  });

  return scaleDecision;
};

export const getScaleDecision = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
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
