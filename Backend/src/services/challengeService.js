import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { generateMockEmbedding } from '../utils/vector.js';
import { createAuditLog } from './auditService.js';

export const createChallenge = async (data, user, ip_address = null) => {
  // Determine department
  const department_id = data.department_id || user.department_id;
  if (!department_id) {
    throw new BadRequestError('A valid department_id must be assigned to the challenge.');
  }

  // Generate semantic embedding vector for challenge
  const embeddingText = `${data.title} ${data.problem_description} ${data.desired_outcome} ${data.required_technologies.join(' ')}`;
  const embedding = generateMockEmbedding(embeddingText);

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
      status: 'DRAFT',
      created_by: user.id,
      embedding
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

  return challenge;
};

export const getChallenges = async (query = {}) => {
  const {
    status,
    department_id,
    search,
    page = 1,
    limit = 20
  } = query;

  const where = {};
  if (status) where.status = status;
  if (department_id) where.department_id = department_id;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { problem_description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

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
            email: true
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
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

export const getChallengeById = async (id) => {
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
          email: true,
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

  return challenge;
};

export const updateChallenge = async (id, data, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Only creator or admin can update challenge
  if (user.role !== 'ADMIN' && challenge.created_by !== user.id) {
    throw new ForbiddenError('You can only update challenges created by your department.');
  }

  // Cannot modify closed or completed challenge
  if (challenge.status === 'CLOSED' || challenge.status === 'COMPLETED') {
    throw new BadRequestError(`Cannot update challenge in ${challenge.status} status.`);
  }

  const updateData = { ...data };
  if (data.title || data.problem_description || data.required_technologies) {
    const title = data.title || challenge.title;
    const desc = data.problem_description || challenge.problem_description;
    const outcome = data.desired_outcome || challenge.desired_outcome;
    const techs = data.required_technologies || challenge.required_technologies;
    updateData.embedding = generateMockEmbedding(`${title} ${desc} ${outcome} ${techs.join(' ')}`);
  }

  const updated = await prisma.challenge.update({
    where: { id },
    data: updateData,
    include: {
      department: true
    }
  });

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

  if (user.role !== 'ADMIN' && challenge.created_by !== user.id) {
    throw new ForbiddenError('You can only delete challenges created by yourself.');
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

  if (user.role !== 'ADMIN' && challenge.created_by !== user.id) {
    throw new ForbiddenError('You can only publish challenges created by yourself.');
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

  return updated;
};

export const closeChallenge = async (id, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  if (user.role !== 'ADMIN' && challenge.created_by !== user.id) {
    throw new ForbiddenError('You can only close challenges created by yourself.');
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

export const getChallengeApplications = async (challengeId, user) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
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

export const getChallengeMatches = async (challengeId) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
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

export const getChallengePilot = async (challengeId) => {
  const pilot = await prisma.pilot.findFirst({
    where: { challenge_id: challengeId },
    include: {
      startup: {
        select: {
          id: true,
          company_name: true,
          domain: true
        }
      },
      kpis: true,
      milestones: true
    }
  });

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
  getChallengeApplications,
  getChallengeMatches,
  getChallengePilot
};
