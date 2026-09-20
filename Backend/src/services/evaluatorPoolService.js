import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';
import { evaluateEvaluatorEligibility } from './evaluatorEligibilityService.js';

/**
 * Evaluator Self-Application & Challenge Final Evaluator Pool Service
 */

/**
 * List open Problem Statements that verified evaluators can discover and apply for
 */
export const getOpenChallengesForEvaluator = async (user, query = {}) => {
  if (user.role !== 'EVALUATOR' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only evaluators and administrators can access open evaluation challenges.');
  }

  const challenges = await prisma.challenge.findMany({
    where: {
      status: { in: ['PUBLISHED', 'EVALUATION'] }
    },
    orderBy: { created_at: 'desc' },
    include: {
      department: {
        select: { id: true, name: true, state: true }
      },
      evaluator_applications: {
        where: { evaluator_id: user.id }
      },
      evaluator_pools: {
        where: { evaluator_id: user.id }
      },
      evaluator_match_scores: {
        where: { evaluator_id: user.id }
      }
    }
  });

  return challenges.map(ch => ({
    id: ch.id,
    title: ch.title,
    problem_description: ch.problem_description,
    department: ch.department?.name,
    state: ch.department?.state,
    required_technologies: ch.required_technologies,
    application_deadline: ch.application_deadline,
    finalist_submission_deadline: ch.finalist_submission_deadline,
    my_application: ch.evaluator_applications?.[0] || null,
    is_in_pool: ch.evaluator_pools?.length > 0,
    match_score: ch.evaluator_match_scores?.[0]?.overall_score || null
  }));
};

/**
 * Evaluator applies to evaluate a Problem Statement
 */
export const applyToEvaluateChallenge = async (challengeId, data, user, ip_address = null) => {
  if (user.role !== 'EVALUATOR' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only evaluators can submit applications to evaluate challenges.');
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot apply: This Problem Statement is CLOSED.');
  }

  if (challenge.status !== 'PUBLISHED' && challenge.status !== 'EVALUATION') {
    throw new BadRequestError(`Cannot apply to challenge in '${challenge.status}' status. Only PUBLISHED and EVALUATION challenges accept evaluator applications.`);
  }

  // Verify evaluator verification status
  const profile = await prisma.evaluatorProfile.findUnique({
    where: { user_id: user.id }
  });

  if (!profile || profile.verification_status !== 'VERIFIED') {
    throw new ForbiddenError('Only verified evaluators can apply to evaluate Problem Statements.');
  }

  // Prevent duplicate application
  const existing = await prisma.evaluatorApplication.findUnique({
    where: {
      challenge_id_evaluator_id: {
        challenge_id: challengeId,
        evaluator_id: user.id
      }
    }
  });

  if (existing) {
    throw new BadRequestError(`You have already submitted an application for this challenge (Status: ${existing.status}).`);
  }

  const application = await prisma.evaluatorApplication.create({
    data: {
      challenge_id: challengeId,
      evaluator_id: user.id,
      statement: data.statement ? data.statement.trim() : null,
      status: 'SUBMITTED'
    },
    include: {
      evaluator: {
        select: { id: true, name: true, email: true, evaluator_profile: true }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'EVALUATOR_APPLICATION_SUBMITTED',
    entity_type: 'EVALUATOR_APPLICATION',
    entity_id: application.id,
    details: {
      challenge_id: challengeId,
      evaluator_name: user.name
    },
    ip_address
  });

  // Notify challenge creator
  if (challenge.created_by) {
    await sendNotification({
      user_id: challenge.created_by,
      title: 'New Evaluator Application',
      message: `Evaluator "${user.name}" has applied to evaluate challenge "${challenge.title}".`,
      type: 'EVALUATOR_APPLIED',
      link: `/government/challenges/${challengeId}/evaluators`
    });
  }

  return application;
};

/**
 * Evaluator retrieves their own self-applications
 */
export const getMyEvaluatorApplications = async (user) => {
  const applications = await prisma.evaluatorApplication.findMany({
    where: { evaluator_id: user.id },
    orderBy: { created_at: 'desc' },
    include: {
      challenge: {
        include: {
          department: { select: { id: true, name: true, state: true } }
        }
      }
    }
  });

  return applications;
};

/**
 * Government / Admin lists all evaluator applications for a challenge
 */
export const getChallengeEvaluatorApplications = async (challengeId, user) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (user.role === 'GOVERNMENT' && user.department_id && challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only view evaluator applications for your assigned department.');
  }

  const applications = await prisma.evaluatorApplication.findMany({
    where: { challenge_id: challengeId },
    orderBy: { created_at: 'desc' },
    include: {
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true,
          evaluator_profile: true
        }
      }
    }
  });

  return applications;
};

/**
 * Government / Admin reviews an evaluator application (SHORTLISTED adds to Final Pool)
 */
export const reviewEvaluatorApplication = async (challengeId, applicationId, data, user, ip_address = null) => {
  const { status, review_reason } = data;

  if (!['SHORTLISTED', 'REJECTED'].includes(status)) {
    throw new BadRequestError('Invalid review status. Allowed: SHORTLISTED, REJECTED.');
  }

  const app = await prisma.evaluatorApplication.findUnique({
    where: { id: applicationId },
    include: { challenge: true, evaluator: true }
  });

  if (!app) {
    throw new NotFoundError(`Evaluator application with ID ${applicationId} not found.`);
  }

  if (user.role === 'GOVERNMENT' && user.department_id && app.challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only review evaluator applications for your assigned department.');
  }

  const updated = await prisma.evaluatorApplication.update({
    where: { id: applicationId },
    data: {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date(),
      review_reason: review_reason ? review_reason.trim() : null
    }
  });

  // If approved/shortlisted, verify eligibility before adding to Final Evaluator Pool
  if (status === 'SHORTLISTED') {
    const evaluatorProfile = await prisma.evaluatorProfile.findUnique({
      where: { user_id: app.evaluator_id }
    });

    const eligibility = evaluateEvaluatorEligibility(evaluatorProfile, app.challenge);
    if (eligibility.state === 'INELIGIBLE') {
      throw new BadRequestError(`Cannot approve applicant: Evaluator is INELIGIBLE for this challenge. Reasons: ${eligibility.reasons.join('; ')}`);
    }

    if (eligibility.state === 'NEEDS_REVIEW') {
      if (!review_reason || review_reason.trim().length < 10) {
        throw new BadRequestError(`Evaluator has status 'NEEDS_REVIEW' for this challenge (${eligibility.reasons.join('; ')}). Explicit government approval with justification (review_reason minimum 10 characters) is required.`);
      }
    }

    await prisma.challengeEvaluatorPool.upsert({
      where: {
        challenge_id_evaluator_id: {
          challenge_id: challengeId,
          evaluator_id: app.evaluator_id
        }
      },
      create: {
        challenge_id: challengeId,
        evaluator_id: app.evaluator_id,
        source: 'APPLICANT',
        added_by: user.id,
        notes: review_reason || 'Approved from self-application'
      },
      update: {
        source: 'APPLICANT',
        notes: review_reason || 'Approved from self-application',
        updated_at: new Date()
      }
    });
  }

  await createAuditLog({
    user_id: user.id,
    action: `EVALUATOR_APPLICATION_${status}`,
    entity_type: 'EVALUATOR_APPLICATION',
    entity_id: applicationId,
    details: {
      challenge_id: challengeId,
      evaluator_id: app.evaluator_id,
      new_status: status,
      review_reason
    },
    ip_address
  });

  await sendNotification({
    user_id: app.evaluator_id,
    title: `Evaluator Application: ${status}`,
    message: `Your application to evaluate challenge "${app.challenge.title}" was marked as ${status}.`,
    type: 'APPLICATION_STATUS_UPDATED',
    link: '/evaluator/dashboard'
  });

  return updated;
};

/**
 * Add an evaluator directly to the Challenge Final Evaluator Pool
 */
export const addToEvaluatorPool = async (challengeId, data, user, ip_address = null) => {
  const { evaluator_id, source = 'MATCHED', notes } = data;

  if (!evaluator_id) {
    throw new BadRequestError('evaluator_id is required.');
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot add evaluators: Problem Statement is CLOSED.');
  }

  if (user.role === 'GOVERNMENT' && user.department_id && challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only curate the evaluator pool for your assigned department.');
  }

  // Ensure evaluator is verified
  const evaluatorUser = await prisma.user.findUnique({
    where: { id: evaluator_id },
    include: { evaluator_profile: true }
  });

  if (!evaluatorUser || evaluatorUser.role !== 'EVALUATOR') {
    throw new BadRequestError('Specified user is not registered as an Evaluator.');
  }

  if (evaluatorUser.evaluator_profile?.verification_status !== 'VERIFIED') {
    throw new ForbiddenError('Only VERIFIED evaluators can be added to the Final Evaluator Pool.');
  }

  // Evaluate deterministic eligibility
  const eligibility = evaluateEvaluatorEligibility(evaluatorUser.evaluator_profile, challenge);

  if (eligibility.state === 'INELIGIBLE') {
    throw new BadRequestError(`Cannot add evaluator to pool: Evaluator is INELIGIBLE for this challenge. Reasons: ${eligibility.reasons.join('; ')}`);
  }

  if (eligibility.state === 'NEEDS_REVIEW') {
    const hasExplicitApproval = Boolean(
      data.approve_needs_review ||
      data.override_justification ||
      (notes && notes.trim().length >= 10)
    );
    if (!hasExplicitApproval) {
      throw new BadRequestError(`Evaluator has eligibility status 'NEEDS_REVIEW' for this challenge (${eligibility.reasons.join('; ')}). Explicit government approval with justification (notes or override_justification of at least 10 characters) is required.`);
    }
  }

  const poolEntry = await prisma.challengeEvaluatorPool.upsert({
    where: {
      challenge_id_evaluator_id: {
        challenge_id: challengeId,
        evaluator_id
      }
    },
    create: {
      challenge_id: challengeId,
      evaluator_id,
      source,
      added_by: user.id,
      notes: notes ? notes.trim() : null
    },
    update: {
      source,
      notes: notes ? notes.trim() : null,
      updated_at: new Date()
    },
    include: {
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true,
          evaluator_profile: true
        }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'EVALUATOR_ADDED_TO_POOL',
    entity_type: 'CHALLENGE_EVALUATOR_POOL',
    entity_id: poolEntry.id,
    details: {
      challenge_id: challengeId,
      evaluator_id,
      source
    },
    ip_address
  });

  return poolEntry;
};

/**
 * Remove an evaluator from the Final Evaluator Pool (only if no completed/active evaluations)
 */
export const removeFromEvaluatorPool = async (challengeId, evaluatorId, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (user.role === 'GOVERNMENT' && user.department_id && challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only curate the evaluator pool for your assigned department.');
  }

  // Check if evaluator has active or completed assignments for this challenge's applications
  const activeAssignments = await prisma.evaluatorAssignment.findMany({
    where: {
      evaluator_id: evaluatorId,
      application: { challenge_id: challengeId },
      status: { in: ['ACCEPTED', 'COMPLETED'] }
    }
  });

  if (activeAssignments.length > 0) {
    throw new BadRequestError('Cannot remove evaluator from pool: Evaluator has active or completed evaluation assignments for this challenge.');
  }

  await prisma.challengeEvaluatorPool.delete({
    where: {
      challenge_id_evaluator_id: {
        challenge_id: challengeId,
        evaluator_id: evaluatorId
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'EVALUATOR_REMOVED_FROM_POOL',
    entity_type: 'CHALLENGE_EVALUATOR_POOL',
    entity_id: `${challengeId}:${evaluatorId}`,
    details: {
      challenge_id: challengeId,
      evaluator_id: evaluatorId
    },
    ip_address
  });

  return { success: true, message: 'Evaluator removed from pool.' };
};

/**
 * Retrieve the Final Evaluator Pool for a challenge
 */
export const getChallengeEvaluatorPool = async (challengeId, user) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (user.role === 'GOVERNMENT' && user.department_id && challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only view the evaluator pool for your assigned department.');
  }

  const poolMembers = await prisma.challengeEvaluatorPool.findMany({
    where: { challenge_id: challengeId },
    orderBy: { created_at: 'asc' },
    include: {
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true,
          evaluator_profile: true
        }
      },
      adder: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Fetch match scores for context
  const matchScores = await prisma.evaluatorMatchScore.findMany({
    where: { challenge_id: challengeId }
  });
  const scoreMap = new Map(matchScores.map(m => [m.evaluator_id, m]));

  return poolMembers.map(p => {
    const match = scoreMap.get(p.evaluator_id);
    return {
      id: p.id,
      evaluator_id: p.evaluator_id,
      name: p.evaluator.name,
      email: p.evaluator.email,
      organization: p.evaluator.evaluator_profile?.organization || 'Independent',
      designation: p.evaluator.evaluator_profile?.designation || 'Specialist',
      domain_expertise: p.evaluator.evaluator_profile?.domain_expertise || [],
      years_experience: p.evaluator.evaluator_profile?.years_experience || 0,
      source: p.source,
      notes: p.notes,
      added_at: p.created_at,
      added_by_name: p.adder?.name,
      match_score: match?.overall_score || null,
      eligibility_state: match?.eligibility_state || 'ELIGIBLE'
    };
  });
};

export default {
  getOpenChallengesForEvaluator,
  applyToEvaluateChallenge,
  getMyEvaluatorApplications,
  getChallengeEvaluatorApplications,
  reviewEvaluatorApplication,
  addToEvaluatorPool,
  removeFromEvaluatorPool,
  getChallengeEvaluatorPool
};
