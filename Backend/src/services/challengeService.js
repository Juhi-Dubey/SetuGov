import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import embeddingService from './embeddingService.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';

export const createChallenge = async (data, user, ip_address = null) => {
  let department_id;

  if (user.role === 'ADMIN') {
    department_id = data.department_id || user.department_id;
    if (!department_id) {
      throw new BadRequestError('A valid department_id must be assigned to the challenge.');
    }
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id) {
      throw new ForbiddenError('Government official must be assigned to a department to create challenges.');
    }
    if (data.department_id && data.department_id !== user.department_id) {
      throw new ForbiddenError('Government officials are only authorized to create challenges for their own assigned department.');
    }
    department_id = user.department_id;
  } else {
    throw new ForbiddenError('Only government officials and administrators can create challenges.');
  }

  // Verify department exists
  const department = await prisma.department.findUnique({
    where: { id: department_id }
  });
  if (!department) {
    throw new BadRequestError(`Department with ID ${department_id} does not exist.`);
  }

  const challenge = await prisma.challenge.create({
    data: {
      department_id,
      title: data.title.trim(),
      problem_description: data.problem_description.trim(),
      current_baseline: data.current_baseline.trim(),
      desired_outcome: data.desired_outcome.trim(),
      location: data.location.trim(),
      budget_min: data.budget_min,
      budget_max: data.budget_max,
      pilot_duration_days: data.pilot_duration_days,
      required_technologies: data.required_technologies,
      application_deadline: data.application_deadline ? new Date(data.application_deadline) : null,
      data_classification: data.data_classification || 'INTERNAL',
      data_access_requirements: data.data_access_requirements ? data.data_access_requirements.trim() : null,
      data_retention_period: data.data_retention_period ? data.data_retention_period.trim() : null,
      ip_ownership: data.ip_ownership || 'STARTUP_OWNED',
      licensing_terms: data.licensing_terms ? data.licensing_terms.trim() : null,
      confidentiality_terms: data.confidentiality_terms ? data.confidentiality_terms.trim() : null,
      status: 'DRAFT',
      created_by: user.id
    },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          state: true
        }
      },
      creator: {
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
    action: 'CHALLENGE_CREATED',
    entity_type: 'CHALLENGE',
    entity_id: challenge.id,
    details: { title: challenge.title, status: challenge.status },
    ip_address
  });

  // Attempt real 768-dim semantic embedding generation
  try {
    const text = embeddingService.buildChallengeEmbeddingText(challenge);
    const emb = await embeddingService.generateEmbedding(text);
    await embeddingService.persistChallengeEmbedding(challenge.id, emb);
  } catch (embErr) {
    logger.warn(`Challenge ${challenge.id} created; embedding generation deferred: ${embErr.message}`);
  }

  return challenge;
};

export const getChallenges = async (query = {}, user = null) => {
  const {
    status,
    department_id,
    search,
    page = 1,
    limit = 20
  } = query;

  const where = {};

  // Part 11: Public / unauthenticated users must strictly only see PUBLISHED challenges.
  if (!user || user.role === 'STARTUP' || user.role === 'EVALUATOR') {
    where.status = 'PUBLISHED';
  } else if (user.role === 'GOVERNMENT') {
    // Government officers see all published challenges plus draft/internal challenges for their own department
    if (status) {
      if (status === 'DRAFT') {
        where.status = 'DRAFT';
        where.department_id = user.department_id;
      } else {
        where.status = status;
      }
    } else {
      where.OR = [
        { status: 'PUBLISHED' },
        { department_id: user.department_id }
      ];
    }
  } else if (user.role === 'ADMIN') {
    if (status) where.status = status;
  }

  if (department_id) where.department_id = department_id;
  if (search) {
    const searchFilter = [
      { title: { contains: search, mode: 'insensitive' } },
      { problem_description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchFilter }];
      delete where.OR;
    } else {
      where.OR = searchFilter;
    }
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  const [total, challenges] = await Promise.all([
    prisma.challenge.count({ where }),
    prisma.challenge.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            state: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        _count: {
          select: {
            applications: true,
            match_scores: true,
            pilots: true
          }
        }
      }
    })
  ]);

  return {
    challenges,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

export const getChallengeById = async (id, user = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          state: true,
          contact_email: true
        }
      },
      creator: {
        select: {
          id: true,
          name: true,
          role: true
        }
      },
      _count: {
        select: {
          applications: true,
          match_scores: true,
          pilots: true
        }
      }
    }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Part 11: Public users must only see PUBLISHED challenges.
  if (challenge.status !== 'PUBLISHED') {
    if (!user || user.role === 'STARTUP' || user.role === 'EVALUATOR') {
      throw new NotFoundError(`Challenge with ID ${id} not found.`);
    }
    if (user.role === 'GOVERNMENT' && user.department_id !== challenge.department_id) {
      throw new ForbiddenError('You do not have permission to view non-published challenges from other departments.');
    }
  }

  return challenge;
};

export const updateChallenge = async (id, data, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT within the same department
  if (user.role === 'ADMIN') {
    // Admin has cross-department management authorization
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only update challenges belonging to your assigned department.');
    }
  } else {
    throw new ForbiddenError('You are not authorized to update this challenge.');
  }

  // Cannot modify closed or completed challenge
  if (challenge.status === 'CLOSED' || challenge.status === 'COMPLETED') {
    throw new BadRequestError(`Cannot update challenge in ${challenge.status} status.`);
  }

  // Whitelist allowable update fields (P1-6: Eliminate mass assignment)
  const allowedFields = [
    'title',
    'problem_description',
    'current_baseline',
    'desired_outcome',
    'location',
    'budget_min',
    'budget_max',
    'pilot_duration_days',
    'required_technologies',
    'application_deadline',
    'data_classification',
    'data_access_requirements',
    'data_retention_period',
    'ip_ownership',
    'licensing_terms',
    'confidentiality_terms'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'application_deadline') {
        updateData[field] = data[field] ? new Date(data[field]) : null;
      } else {
        updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
      }
    }
  }

  const updated = await prisma.challenge.update({
    where: { id },
    data: updateData,
    include: {
      department: true
    }
  });

  if (updateData.title || updateData.problem_description || updateData.required_technologies || updateData.desired_outcome) {
    try {
      const text = embeddingService.buildChallengeEmbeddingText(updated);
      const emb = await embeddingService.generateEmbedding(text);
      await embeddingService.persistChallengeEmbedding(updated.id, emb);
    } catch (embErr) {
      logger.warn(`Challenge ${updated.id} updated; embedding refresh deferred: ${embErr.message}`);
    }
  }

  await createAuditLog({
    user_id: user.id,
    action: 'CHALLENGE_UPDATED',
    entity_type: 'CHALLENGE',
    entity_id: id,
    details: { changes: data },
    ip_address
  });

  return updated;
};

export const deleteChallenge = async (id, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT within the same department
  if (user.role === 'ADMIN') {
    // Admin has cross-department management authorization
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only delete challenges belonging to your assigned department.');
    }
  } else {
    throw new ForbiddenError('You are not authorized to delete this challenge.');
  }

  if (challenge.status !== 'DRAFT') {
    throw new BadRequestError('Only DRAFT challenges can be deleted.');
  }

  await prisma.challenge.delete({ where: { id } });

  await createAuditLog({
    user_id: user.id,
    action: 'CHALLENGE_DELETED',
    entity_type: 'CHALLENGE',
    entity_id: id,
    details: { title: challenge.title },
    ip_address
  });

  return { message: 'Challenge deleted successfully.' };
};

export const publishChallenge = async (id, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT within the same department
  if (user.role === 'ADMIN') {
    // Admin has cross-department management authorization
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only publish challenges belonging to your assigned department.');
    }
  } else {
    throw new ForbiddenError('You are not authorized to publish this challenge.');
  }

  // Validate state transition DRAFT -> PUBLISHED
  validateTransition('CHALLENGE', challenge.status, 'PUBLISHED');

  const updated = await prisma.challenge.update({
    where: { id },
    data: { status: 'PUBLISHED' },
    include: {
      department: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'CHALLENGE_PUBLISHED',
    entity_type: 'CHALLENGE',
    entity_id: id,
    details: { previousStatus: challenge.status, newStatus: 'PUBLISHED' },
    ip_address
  });

  await sendNotification({
    user_id: user.id,
    title: 'Challenge Published',
    message: `Challenge "${challenge.title}" is now PUBLISHED and open for applications.`,
    type: 'CHALLENGE_PUBLISHED',
    link: `/government/challenges/${id}/overview`
  });

  return updated;
};

export const closeChallenge = async (id, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT within the same department
  if (user.role === 'ADMIN') {
    // Admin has cross-department management authorization
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only close challenges belonging to your assigned department.');
    }
  } else {
    throw new ForbiddenError('You are not authorized to close this challenge.');
  }

  // Validate state transition -> CLOSED
  validateTransition('CHALLENGE', challenge.status, 'CLOSED');

  const updated = await prisma.challenge.update({
    where: { id },
    data: { status: 'CLOSED' },
    include: {
      department: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'CHALLENGE_CLOSED',
    entity_type: 'CHALLENGE',
    entity_id: id,
    details: { previousStatus: challenge.status, newStatus: 'CLOSED' },
    ip_address
  });

  return updated;
};

/**
 * Generic transition method for Challenge lifecycle progression
 * (DRAFT -> PUBLISHED -> CLOSED/EVALUATION -> PILOT -> COMPLETED)
 */
export const transitionChallengeStatus = async (id, nextStatus, user, ip_address = null, reason = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT within the same department
  if (user.role === 'ADMIN') {
    // Admin has cross-department management authorization
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only update challenges belonging to your assigned department.');
    }
  } else {
    throw new ForbiddenError('You are not authorized to update challenge lifecycle status.');
  }

  // Validate state machine transition
  validateTransition('CHALLENGE', challenge.status, nextStatus);

  const updated = await prisma.challenge.update({
    where: { id },
    data: { status: nextStatus },
    include: { department: true }
  });

  await createAuditLog({
    user_id: user.id,
    action: `CHALLENGE_${nextStatus}`,
    entity_type: 'CHALLENGE',
    entity_id: id,
    details: {
      previousStatus: challenge.status,
      newStatus: nextStatus,
      reason
    },
    ip_address
  });

  await sendNotification({
    user_id: user.id,
    title: `Challenge Status: ${nextStatus}`,
    message: `Challenge "${challenge.title}" transitioned to ${nextStatus}.`,
    type: `CHALLENGE_${nextStatus}`,
    link: `/government/challenges/${id}/overview`
  });

  return updated;
};

export const getChallengeApplications = async (challengeId, user) => {
  if (!user || (user.role !== 'ADMIN' && user.role !== 'GOVERNMENT')) {
    throw new ForbiddenError('You are not authorized to view applications for this challenge.');
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // P1-5: GOVERNMENT can only view applications for challenges in their own department
  if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only view applications for challenges belonging to your assigned department.');
    }
  }

  const applications = await prisma.application.findMany({
    where: { challenge_id: challengeId },
    orderBy: { created_at: 'desc' },
    include: {
      startup: {
        select: {
          id: true,
          company_name: true,
          domain: true,
          technologies: true,
          readiness_level: true,
          verification_status: true
        }
      },
      evaluations: {
        select: {
          id: true,
          evaluator_id: true,
          total_score: true
        }
      }
    }
  });

  return applications;
};

export const getChallengeMatches = async (challengeId, user = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // P1-8: Consistent tenant check on matches
  if (user && user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only view match scores for challenges in your assigned department.');
    }
  }

  const matches = await prisma.matchScore.findMany({
    where: { challenge_id: challengeId },
    orderBy: { overall_score: 'desc' },
    include: {
      startup: {
        select: {
          id: true,
          company_name: true,
          description: true,
          domain: true,
          technologies: true,
          readiness_level: true,
          years_experience: true,
          verification_status: true,
          location: true
        }
      }
    }
  });

  return matches;
};

export const getChallengePilot = async (challengeId, user = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  const pilot = await prisma.pilot.findFirst({
    where: { challenge_id: challengeId },
    include: {
      startup: {
        select: {
          id: true,
          user_id: true,
          company_name: true,
          domain: true
        }
      },
      kpis: true,
      milestones: true
    }
  });

  if (!pilot) {
    return null;
  }

  // P1-8: Authorization for challenge pilot view
  if (user) {
    if (user.role === 'GOVERNMENT') {
      if (!user.department_id || challenge.department_id !== user.department_id) {
        throw new ForbiddenError('You can only view pilots for challenges in your assigned department.');
      }
    } else if (user.role === 'STARTUP') {
      if (pilot.startup.user_id !== user.id) {
        throw new ForbiddenError('You can only view your own startup\'s pilot project.');
      }
    }
  }

  return pilot;
};

export default {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  publishChallenge,
  closeChallenge,
  transitionChallengeStatus,
  getChallengeApplications,
  getChallengeMatches,
  getChallengePilot
};