import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { evaluateEligibility } from '../utils/eligibility.js';
import { createAuditLog } from './auditService.js';
import {
  sendNotification,
  notifyStartupShortlisted,
  notifyStartupFinalized
} from './notificationService.js';
import { evaluateApplicationDecision } from './decisionEngineService.js';

export const createApplication = async (challengeIdParam, data, user, ip_address = null) => {
  const challengeId = challengeIdParam || data?.challenge_id || data?.challengeId;

  if (!challengeId) {
    throw new BadRequestError('A valid challengeId is required to submit an application.');
  }

  // 1. Verify Challenge exists and is PUBLISHED
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (challenge.status !== 'PUBLISHED') {
    throw new BadRequestError(`Cannot submit applications for challenge with status '${challenge.status}'. Challenge must be PUBLISHED.`);
  }

  // Application Deadline Enforcement (Phase 2-6)
  if (challenge.application_deadline) {
    const deadline = new Date(challenge.application_deadline);
    if (new Date() > deadline) {
      throw new BadRequestError(`The application deadline for this challenge passed on ${deadline.toLocaleDateString('en-IN')}. Submissions are closed.`);
    }
  }

  // 2. Resolve Startup for user (never trust frontend startup_id)
  const startup = await prisma.startup.findFirst({
    where: { user_id: user.id }
  });

  if (!startup) {
    throw new BadRequestError('You must create a startup profile before applying to government challenges.');
  }

  // Mandatory Verification Check: Only VERIFIED startups can apply
  if (startup.verification_status !== 'VERIFIED') {
    throw new ForbiddenError(
      `Your startup is not verified (current status: ${startup.verification_status || 'UNVERIFIED'}). Only VERIFIED startups can apply to government challenges.`
    );
  }

  // Mandatory Eligibility Evaluation (Verification, Domain, Capabilities, TRL)
  const eligibility = evaluateEligibility(challenge, startup);
  if (eligibility.eligibility_status === 'INELIGIBLE') {
    throw new ForbiddenError(
      `Your startup is not eligible to apply for this challenge: ${eligibility.ineligibility_reasons.join('; ')}`
    );
  }

  // 3. Prevent duplicate applications
  const existingApp = await prisma.application.findUnique({
    where: {
      challenge_id_startup_id: {
        challenge_id: challengeId,
        startup_id: startup.id
      }
    }
  });

  if (existingApp) {
    throw new ConflictError('Your startup has already submitted an application for this challenge.');
  }

  const initialStatus = data.status || 'SUBMITTED';

  // Normalize fields between UI form conventions and database schema
  const proposal = (data.proposal || data.proposal_summary || data.problemUnderstanding || '').trim();
  const technical_approach = (data.technical_approach || data.proposedSolution || '').trim();
  const expected_impact = (data.expected_impact || data.expectedImpact || '').trim();
  const estimated_cost = Number(data.estimated_cost ?? data.proposed_budget ?? data.proposedBudget ?? 0);
  const timeline = String(data.timeline || data.proposed_timeline_days || data.proposedTimeline || '30 days').trim();

  // 4. Create Application
  let application;
  try {
    application = await prisma.application.create({
      data: {
        challenge_id: challengeId,
        startup_id: startup.id,
        proposal,
        technical_approach,
        expected_impact,
        estimated_cost,
        timeline,
        status: initialStatus,
        submitted_at: initialStatus === 'SUBMITTED' ? new Date() : null
      },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        startup: {
          select: {
            id: true,
            company_name: true,
            verification_status: true
          }
        }
      }
    });
  } catch (dbErr) {
    if (dbErr.code === 'P2002') {
      throw new ConflictError('Your startup has already submitted an application for this challenge.');
    }
    if (dbErr.code === 'P2025' || dbErr.code === 'P2003') {
      throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
    }
    throw dbErr;
  }

  await createAuditLog({
    user_id: user.id,
    action: 'APPLICATION_SUBMITTED',
    entity_type: 'APPLICATION',
    entity_id: application.id,
    details: {
      challenge_id: challengeId,
      startup_id: startup.id,
      status: application.status
    },
    ip_address
  });

  // Notify the startup user
  await sendNotification({
    user_id: user.id,
    title: 'Proposal Submitted',
    message: `Your application for challenge "${challenge.title}" was submitted successfully.`,
    type: 'APPLICATION_SUBMITTED',
    link: '/startup/applications'
  });

  // Notify the government challenge creator if present
  if (challenge.created_by) {
    await sendNotification({
      user_id: challenge.created_by,
      title: 'New Application Received',
      message: `Startup "${startup.company_name}" submitted a proposal for "${challenge.title}".`,
      type: 'APPLICATION_RECEIVED',
      link: `/government/challenges/${challengeId}/applications`
    });
  }

  return application;
};

export const getApplicationById = async (id, user) => {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      challenge: {
        include: {
          department: true
        }
      },
      startup: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          documents: true
        }
      },
      evaluations: {
        include: {
          evaluator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  // Access check: Startup can only see their own application
  if (user.role === 'STARTUP' && application.startup.user_id !== user.id) {
    throw new ForbiddenError('You do not have permission to view another startup\'s application.');
  }

  // Access check: GOVERNMENT can only view applications for their department's challenges
  if (user.role === 'GOVERNMENT') {
    if (!user.department_id || application.challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You do not have permission to view applications outside your assigned department.');
    }
  }

  // Access check: EVALUATOR can only view applications they are assigned to
  if (user.role === 'EVALUATOR') {
    const assignment = await prisma.evaluatorAssignment.findUnique({
      where: {
        application_id_evaluator_id: {
          application_id: id,
          evaluator_id: user.id
        }
      }
    });

    if (!assignment) {
      throw new ForbiddenError('You do not have permission to view this application because you are not assigned to it.');
    }
  }

  return application;
};

export const updateApplication = async (id, data, user, ip_address = null) => {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      startup: true,
      challenge: true,
      evaluations: { select: { id: true } }
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  if (application.challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot update application: This problem statement is CLOSED.');
  }

  if (application.evaluations.length > 0) {
    throw new BadRequestError('Cannot modify application: Independent evaluation has already commenced on this application.');
  }

  if (user.role !== 'ADMIN' && application.startup.user_id !== user.id) {
    throw new ForbiddenError('You can only update your own startup application.');
  }

  if (application.status !== 'DRAFT' && user.role !== 'ADMIN') {
    throw new BadRequestError('Submitted applications cannot be modified. Only DRAFT applications can be edited.');
  }

  // Whitelist allowable update fields (P1-6: Eliminate mass assignment)
  const allowedFields = [
    'proposal',
    'technical_approach',
    'expected_impact',
    'estimated_cost',
    'timeline'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
    }
  }

  if (updateData.status === 'SUBMITTED' && application.status === 'DRAFT') {
    updateData.submitted_at = new Date();
  }

  const updated = await prisma.application.update({
    where: { id },
    data: updateData,
    include: {
      challenge: true,
      startup: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'APPLICATION_UPDATED',
    entity_type: 'APPLICATION',
    entity_id: id,
    details: { changes: updateData },
    ip_address
  });

  return updated;
};

export const deleteApplication = async (id, user, ip_address = null) => {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { startup: true }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  if (user.role !== 'ADMIN' && application.startup.user_id !== user.id) {
    throw new ForbiddenError('You can only delete your own application.');
  }

  if (application.status !== 'DRAFT') {
    throw new BadRequestError('Only DRAFT applications can be deleted.');
  }

  await prisma.application.delete({ where: { id } });

  await createAuditLog({
    user_id: user.id,
    action: 'APPLICATION_DELETED',
    entity_type: 'APPLICATION',
    entity_id: id,
    ip_address
  });

  return { message: 'Application deleted successfully.' };
};

export const updateApplicationStatus = async (id, nextStatus, user, ip_address = null, reason = null, override_justification = null) => {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      challenge: true,
      startup: true
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  // Phase 14: CLOSED challenge freezes downstream operations
  if (application.challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot update application status: Problem Statement is CLOSED.');
  }

  // Only GOVERNMENT or ADMIN can transition application status
  if (user.role !== 'ADMIN' && user.role !== 'GOVERNMENT') {
    throw new ForbiddenError('Only Government officials or Administrators can change application status.');
  }

  // P1-5: GOVERNMENT can only transition applications for challenges in their assigned department
  if (user.role === 'GOVERNMENT') {
    if (!user.department_id || application.challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only update status of applications for challenges in your assigned department.');
    }
  }

  if (application.status === nextStatus) {
    throw new BadRequestError(`Application is already in ${nextStatus} status.`);
  }

  // Validate state machine transition
  validateTransition('APPLICATION', application.status, nextStatus);

  // Phase 11, 12, 13: Governance Gates for SELECTED transition
  if (nextStatus === 'SELECTED') {
    // Challenge lifecycle gate: Challenge must be in EVALUATION stage
    if (application.challenge.status !== 'EVALUATION') {
      throw new BadRequestError(
        `Cannot select startup: Problem Statement is in '${application.challenge.status}' stage. It must be transitioned to 'EVALUATION' stage before selecting a startup.`
      );
    }

    const decision = await evaluateApplicationDecision(id, user);

    // 1. Quorum Verification: minimum 2 independent evaluations
    if (!decision.evaluation_assessment.quorum_met || decision.evaluation_assessment.evaluation_count < 2) {
      throw new BadRequestError(
        `Cannot select startup: Evaluation quorum (minimum 2 independent evaluations) has not been met. Current valid evaluations: ${decision.evaluation_assessment.evaluation_count}.`
      );
    }

    if (decision.recommendation === 'EVALUATION_PENDING_QUORUM') {
      throw new BadRequestError('Cannot select startup: Evaluation quorum has not been met.');
    }

    // 2. Decision Engine Consensus: non-recommended requires mandatory written justification
    if (decision.recommendation === 'NOT_RECOMMENDED' || decision.recommendation === 'RESERVE_CANDIDATE') {
      if (!override_justification || !override_justification.trim()) {
        throw new BadRequestError(
          `Cannot select startup: Decision Engine recommendation is "${decision.recommendation}". A mandatory written override justification is required.`
        );
      }

      await createAuditLog({
        user_id: user.id,
        action: 'GOVERNMENT_SELECTION_OVERRIDE',
        entity_type: 'APPLICATION',
        entity_id: id,
        details: {
          recommendation: decision.recommendation,
          override_justification: override_justification.trim(),
          evaluation_score: decision.evaluation_assessment.average_total_score,
          challenge_id: application.challenge_id,
          startup_id: application.startup_id
        },
        ip_address
      });
    }
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      status: nextStatus
    },
    include: {
      challenge: true,
      startup: true
    }
  });

  // If SELECTED, log selection action
  const action = nextStatus === 'SELECTED' ? 'STARTUP_SELECTED' : `APPLICATION_${nextStatus}`;

  await createAuditLog({
    user_id: user.id,
    action,
    entity_type: 'APPLICATION',
    entity_id: id,
    details: {
      previousStatus: application.status,
      newStatus: nextStatus,
      reason,
      override_justification: override_justification || null,
      challenge_id: application.challenge_id,
      startup_id: application.startup_id
    },
    ip_address
  });

  // Notify the startup user regarding the status transition
  if (nextStatus === 'SHORTLISTED') {
    await notifyStartupShortlisted({
      applicationId: id,
      challengeId: updated.challenge_id,
      startupId: updated.startup_id,
      challengeTitle: updated.challenge?.title,
      startupName: updated.startup?.company_name
    });
  } else if (nextStatus === 'SELECTED') {
    await notifyStartupFinalized({
      applicationId: id,
      challengeId: updated.challenge_id,
      startupId: updated.startup_id,
      challengeTitle: updated.challenge?.title,
      startupName: updated.startup?.company_name
    });
  } else if (application.startup?.user_id) {
    await sendNotification({
      user_id: application.startup.user_id,
      title: `Application ${nextStatus}`,
      message: `Your application for "${application.challenge.title}" has been updated to ${nextStatus}.`,
      type: `APPLICATION_${nextStatus}`,
      link: '/startup/applications'
    });
  }

  return updated;
};

export default {
  createApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
  updateApplicationStatus
};
