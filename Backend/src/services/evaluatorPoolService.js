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

  if (challenge.evaluator_recruitment_status === 'CLOSED') {
    throw new BadRequestError('Cannot apply: Evaluator recruitment for this Problem Statement is CLOSED.');
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
    if (['SUBMITTED', 'SHORTLISTED'].includes(existing.status)) {
      throw new BadRequestError(`You have already submitted an application for this challenge (Status: ${existing.status}).`);
    }

    // If previous status was NOT_SELECTED or WITHDRAWN and recruitment is OPEN, allow re-applying
    const reApplication = await prisma.evaluatorApplication.update({
      where: { id: existing.id },
      data: {
        statement: data.statement ? data.statement.trim() : existing.statement,
        status: 'SUBMITTED',
        reviewed_by: null,
        reviewed_at: null,
        review_reason: null,
        updated_at: new Date()
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
      entity_id: reApplication.id,
      details: {
        challenge_id: challengeId,
        evaluator_name: user.name,
        is_reapplication: true
      },
      ip_address
    });

    if (challenge.created_by) {
      await sendNotification({
        user_id: challenge.created_by,
        title: 'New Evaluator Application',
        message: `Evaluator "${user.name}" has applied to evaluate challenge "${challenge.title}".`,
        type: 'EVALUATOR_APPLIED',
        link: `/government/challenges/${challengeId}/evaluators`
      });
    }

    return reApplication;
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
    where: { id: challengeId },
    include: {
      department: { select: { id: true, name: true, state: true } }
    }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (user.role === 'GOVERNMENT' && user.department_id && challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only view evaluator applications for your assigned department.');
  }

  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can view evaluator applications.');
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
      },
      reviewer: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Fetch assignment metrics for this challenge
  const assignments = await prisma.evaluatorAssignment.findMany({
    where: {
      application: { challenge_id: challengeId }
    },
    select: {
      id: true,
      evaluator_id: true,
      status: true
    }
  });

  const requiredCount = challenge.required_evaluator_count || 3;
  const shortlistedCount = applications.filter(a => a.status === 'SHORTLISTED').length;
  const assignmentsAccepted = assignments.filter(a => a.status === 'ACCEPTED').length;
  const assignmentsPending = assignments.filter(a => a.status === 'PENDING').length;
  const stillRequired = Math.max(0, requiredCount - shortlistedCount);

  const mappedApps = applications.map(a => ({
    id: a.id,
    challenge_id: a.challenge_id,
    evaluator_id: a.evaluator_id,
    name: a.evaluator?.name,
    email: a.evaluator?.email,
    organization: a.evaluator?.evaluator_profile?.organization || 'Independent Evaluator',
    designation: a.evaluator?.evaluator_profile?.designation || 'Domain Specialist',
    domain_expertise: a.evaluator?.evaluator_profile?.domain_expertise || [],
    years_experience: a.evaluator?.evaluator_profile?.years_experience || 0,
    bio: a.evaluator?.evaluator_profile?.bio || null,
    statement: a.statement,
    status: a.status,
    created_at: a.created_at,
    updated_at: a.updated_at,
    reviewed_at: a.reviewed_at,
    review_reason: a.review_reason,
    reviewed_by_name: a.reviewer?.name,
    evaluator: a.evaluator
  }));

  return {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      department_name: challenge.department?.name,
      state: challenge.department?.state,
      status: challenge.status,
      evaluator_recruitment_status: challenge.evaluator_recruitment_status || 'OPEN',
      required_evaluator_count: requiredCount
    },
    metrics: {
      required_evaluator_count: requiredCount,
      shortlisted_count: shortlistedCount,
      assignments_accepted_count: assignmentsAccepted,
      assignments_pending_count: assignmentsPending,
      still_required_count: stillRequired,
      total_applications_count: applications.length,
      recruitment_status: challenge.evaluator_recruitment_status || 'OPEN'
    },
    applications: mappedApps
  };
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

/**
 * Close evaluator application recruitment in bulk:
 * Confirms shortlisted evaluators and server-side transitions all remaining SUBMITTED
 * applications to NOT_SELECTED within an atomic transaction.
 */
export const closeEvaluatorRecruitment = async (challengeId, data = {}, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can close evaluator recruitment.');
  }

  if (user.role === 'GOVERNMENT' && user.department_id && challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only manage evaluator recruitment for your assigned department.');
  }

  if (challenge.evaluator_recruitment_status === 'CLOSED') {
    throw new BadRequestError('Evaluator recruitment for this Problem Statement is already CLOSED.');
  }

  const requiredCount = challenge.required_evaluator_count || 3;

  const shortlisted = await prisma.evaluatorApplication.findMany({
    where: {
      challenge_id: challengeId,
      status: 'SHORTLISTED'
    },
    include: {
      evaluator: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Hard minimum: at least 2 evaluators must be shortlisted, cannot be overridden
  const poolMembers = await prisma.challengeEvaluatorPool.findMany({
    where: { challenge_id: challengeId },
    select: { evaluator_id: true }
  });

  // Combine unique evaluators from shortlisted apps and pool members
  const uniqueEvaluatorIds = new Set([
    ...shortlisted.map(a => a.evaluator_id),
    ...poolMembers.map(p => p.evaluator_id)
  ]);

  if (uniqueEvaluatorIds.size < 2) {
    throw new BadRequestError('Cannot close evaluator recruitment: Problem statement requires at least 2 evaluators in the pool.');
  }

  if (shortlisted.length < requiredCount && !data.force_override) {
    throw new BadRequestError(
      `Cannot close evaluator recruitment: Only ${shortlisted.length} of ${requiredCount} required evaluators have been shortlisted. Please shortlist at least ${requiredCount} evaluators before closing intake.`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update Challenge recruitment status
    const updatedChallenge = await tx.challenge.update({
      where: { id: challengeId },
      data: {
        evaluator_recruitment_status: 'CLOSED'
      }
    });

    // 2. Transition all remaining SUBMITTED applications to NOT_SELECTED
    const updatedNotSelected = await tx.evaluatorApplication.updateMany({
      where: {
        challenge_id: challengeId,
        status: 'SUBMITTED'
      },
      data: {
        status: 'NOT_SELECTED',
        reviewed_by: user.id,
        reviewed_at: new Date(),
        review_reason: data.closing_notes || 'Intake closed; applicant was not selected for this evaluation cycle.'
      }
    });

    // 3. Ensure all shortlisted evaluators are added into ChallengeEvaluatorPool
    for (const app of shortlisted) {
      await tx.challengeEvaluatorPool.upsert({
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
          notes: app.review_reason || 'Shortlisted and confirmed upon recruitment closure'
        },
        update: {
          source: 'APPLICANT',
          updated_at: new Date()
        }
      });
    }

    // 4. Record Audit Log
    await createAuditLog({
      tx,
      user_id: user.id,
      action: 'EVALUATOR_RECRUITMENT_CLOSED',
      entity_type: 'CHALLENGE',
      entity_id: challengeId,
      details: {
        challenge_id: challengeId,
        required_count: requiredCount,
        shortlisted_count: shortlisted.length,
        not_selected_count: updatedNotSelected.count
      },
      ip_address
    });

    return {
      challenge: updatedChallenge,
      shortlisted_count: shortlisted.length,
      not_selected_count: updatedNotSelected.count
    };
  }, { timeout: 15000, maxWait: 10000 });

  // Post-transaction notifications:
  for (const app of shortlisted) {
    sendNotification({
      user_id: app.evaluator_id,
      title: 'Selected for Evaluation Panel',
      message: `Congratulations! You have been shortlisted and selected for challenge "${challenge.title}".`,
      type: 'EVALUATOR_SHORTLISTED',
      link: '/evaluator/dashboard'
    }).catch(() => {});
  }

  const notSelectedApps = await prisma.evaluatorApplication.findMany({
    where: {
      challenge_id: challengeId,
      status: 'NOT_SELECTED'
    },
    select: { evaluator_id: true }
  });

  for (const app of notSelectedApps) {
    sendNotification({
      user_id: app.evaluator_id,
      title: 'Evaluator Intake Concluded',
      message: `Evaluator recruitment for challenge "${challenge.title}" has closed. Your application was not selected for this cycle.`,
      type: 'EVALUATOR_NOT_SELECTED',
      link: '/evaluator/my-applications'
    }).catch(() => {});
  }

  return {
    success: true,
    message: `Evaluator recruitment closed successfully. ${shortlisted.length} evaluators confirmed, ${result.not_selected_count} applicants marked NOT_SELECTED.`,
    challenge_id: challengeId,
    recruitment_status: 'CLOSED',
    shortlisted_count: shortlisted.length,
    not_selected_count: result.not_selected_count
  };
};

/**
 * Reopen evaluator application recruitment for a Problem Statement
 */
export const reopenEvaluatorRecruitment = async (challengeId, data = {}, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can reopen evaluator recruitment.');
  }

  if (user.role === 'GOVERNMENT' && user.department_id && challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only manage evaluator recruitment for your assigned department.');
  }

  if (challenge.evaluator_recruitment_status === 'OPEN') {
    throw new BadRequestError('Evaluator recruitment is already OPEN for this Problem Statement.');
  }

  const updated = await prisma.challenge.update({
    where: { id: challengeId },
    data: {
      evaluator_recruitment_status: 'OPEN'
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'EVALUATOR_RECRUITMENT_REOPENED',
    entity_type: 'CHALLENGE',
    entity_id: challengeId,
    details: {
      challenge_id: challengeId,
      reopened_by: user.name
    },
    ip_address
  });

  return {
    success: true,
    message: 'Evaluator recruitment reopened successfully. New applications can now be received.',
    challenge_id: challengeId,
    recruitment_status: 'OPEN',
    evaluator_recruitment_status: 'OPEN'
  };
};

/**
 * Update challenge evaluator recruitment settings (e.g. required_evaluator_count)
 */
export const updateChallengeEvaluatorRecruitment = async (challengeId, data, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can update evaluator recruitment settings.');
  }

  if (user.role === 'GOVERNMENT' && user.department_id && challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only manage evaluator recruitment for your assigned department.');
  }

  const updateData = {};
  if (data.required_evaluator_count !== undefined) {
    const count = parseInt(data.required_evaluator_count, 10);
    if (isNaN(count) || count < 2) {
      throw new BadRequestError('required_evaluator_count must be at least 2 evaluators.');
    }
    updateData.required_evaluator_count = count;
  }

  if (data.evaluator_recruitment_status !== undefined) {
    if (!['OPEN', 'CLOSED'].includes(data.evaluator_recruitment_status)) {
      throw new BadRequestError('evaluator_recruitment_status must be either OPEN or CLOSED.');
    }
    updateData.evaluator_recruitment_status = data.evaluator_recruitment_status;
  }

  const updated = await prisma.challenge.update({
    where: { id: challengeId },
    data: updateData
  });

  return {
    success: true,
    challenge_id: challengeId,
    required_evaluator_count: updated.required_evaluator_count,
    evaluator_recruitment_status: updated.evaluator_recruitment_status
  };
};

export default {
  getOpenChallengesForEvaluator,
  applyToEvaluateChallenge,
  getMyEvaluatorApplications,
  getChallengeEvaluatorApplications,
  reviewEvaluatorApplication,
  closeEvaluatorRecruitment,
  reopenEvaluatorRecruitment,
  updateChallengeEvaluatorRecruitment,
  addToEvaluatorPool,
  removeFromEvaluatorPool,
  getChallengeEvaluatorPool
};
