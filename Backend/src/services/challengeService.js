import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { parsePaginationParams, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../utils/pagination.js';
import embeddingService from './embeddingService.js';
import { matchStartupsForChallenge, getChallengeMatches as getAuthoritativeChallengeMatches } from './matchingService.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';
import { sendEmail } from './emailService.js';
import aiService from './aiService.js';

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

  if (!data.application_deadline || (typeof data.application_deadline === 'string' && !data.application_deadline.trim())) {
    throw new BadRequestError('Application deadline is required.');
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
      current_process: data.current_process ? data.current_process.trim() : null,
      pilot_location: data.pilot_location ? data.pilot_location.trim() : null,
      pilot_start_date: data.pilot_start_date ? new Date(data.pilot_start_date) : null,
      pilot_end_date: data.pilot_end_date ? new Date(data.pilot_end_date) : null,
      startup_requirements: data.startup_requirements ? data.startup_requirements.trim() : null,
      kpis: data.kpis || null,
      milestones: data.milestones || null,
      eligibility_requirements: data.eligibility_requirements || null,
      required_documents: data.required_documents || null,
      cybersecurity_requirements: data.cybersecurity_requirements ? data.cybersecurity_requirements.trim() : null,
      data_compliance: data.data_compliance ? data.data_compliance.trim() : null,
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
    search
  } = query;

  const { page, limit, skip, take } = parsePaginationParams(query);

  const where = {};

  // Unauthenticated users must strictly only see PUBLISHED challenges.
  if (!user) {
    where.status = 'PUBLISHED';
    if (department_id) where.department_id = department_id;
  } else if (user.role === 'STARTUP' || user.role === 'EVALUATOR') {
    // Startups and Evaluators can view all active and completed non-draft procurement challenges across departments
    if (status) {
      if (status !== 'DRAFT') {
        where.status = status;
      } else {
        where.status = 'PUBLISHED';
      }
    } else {
      where.status = { in: ['PUBLISHED', 'EVALUATION', 'PILOT', 'COMPLETED', 'CLOSED'] };
    }
    if (department_id) where.department_id = department_id;
  } else if (user.role === 'GOVERNMENT') {
    // Government officers strictly see challenges belonging to their own department across all statuses
    where.department_id = user.department_id;
    if (status) {
      where.status = status;
    }
  } else if (user.role === 'ADMIN') {
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;
  }
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

  const [total, challenges] = await Promise.all([
    prisma.challenge.count({ where }),
    prisma.challenge.findMany({
      where,
      skip,
      take,
      orderBy: [
        { created_at: 'desc' },
        { id: 'desc' }
      ],
      include: {
        department: {
          select: {
            id: true,
            name: true,
            state: true,
            contact_email: true,
            official_website: true,
            department_code: true
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
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit)
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
          contact_email: true,
          official_website: true,
          department_code: true,
          nodal_officer_name: true,
          nodal_officer_designation: true
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

  // Visibility enforcement:
  // - Unauthenticated users can only see PUBLISHED challenges.
  // - Startups and Evaluators cannot see internal Government DRAFT challenges, but can see all other stages.
  // - Government officers cannot see DRAFT challenges from other departments.
  if (!user) {
    if (challenge.status !== 'PUBLISHED') {
      throw new NotFoundError(`Challenge with ID ${id} not found.`);
    }
  } else if (user.role === 'STARTUP' || user.role === 'EVALUATOR') {
    if (challenge.status === 'DRAFT') {
      throw new NotFoundError(`Challenge with ID ${id} not found.`);
    }
  } else if (user.role === 'GOVERNMENT') {
    if (challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You do not have permission to view challenges from other departments.');
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

  // Only DRAFT challenges may be edited. Procurement integrity lock: PUBLISHED, EVALUATION, PILOT, CLOSED, and COMPLETED are immutable.
  if (challenge.status !== 'DRAFT') {
    throw new BadRequestError(`Cannot update challenge in '${challenge.status}' status. Only DRAFT challenges can be modified.`);
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
    'confidentiality_terms',
    'current_process',
    'pilot_location',
    'pilot_start_date',
    'pilot_end_date',
    'startup_requirements',
    'kpis',
    'milestones',
    'eligibility_requirements',
    'required_documents',
    'cybersecurity_requirements',
    'data_compliance'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'application_deadline' || field === 'pilot_start_date' || field === 'pilot_end_date') {
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

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.challenge.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: {
        department: true
      }
    });

    await createAuditLog({
      tx,
      user_id: user.id,
      action: 'CHALLENGE_PUBLISHED',
      entity_type: 'CHALLENGE',
      entity_id: id,
      details: { previousStatus: challenge.status, newStatus: 'PUBLISHED' },
      ip_address
    });

    return res;
  });

  await sendNotification({
    user_id: user.id,
    title: 'Challenge Published',
    message: `Challenge "${challenge.title}" is now PUBLISHED and open for applications.`,
    type: 'CHALLENGE_PUBLISHED',
    link: `/government/challenges/${id}/overview`
  });

  // Step 3: Synchronously await initial candidate discovery pool matching upon challenge publish
  try {
    await matchStartupsForChallenge(id, user, ip_address);
  } catch (err) {
    logger.warn(`Initial matching on publish for challenge ${id} completed with warning: ${err.message}`);
  }

  return updated;
};

export const startChallengeEvaluation = async (id, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT within the same department
  if (user.role === 'ADMIN') {
    // Admin has cross-department management authorization
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only start evaluation for challenges belonging to your assigned department.');
    }
  } else {
    throw new ForbiddenError('You are not authorized to start evaluation for this challenge.');
  }

  // Canonical state transition check: only PUBLISHED -> EVALUATION is valid
  validateTransition('CHALLENGE', challenge.status, 'EVALUATION');

  const updated = await prisma.challenge.update({
    where: { id },
    data: { status: 'EVALUATION' },
    include: {
      department: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'CHALLENGE_EVALUATION_STARTED',
    entity_type: 'CHALLENGE',
    entity_id: id,
    details: { previousStatus: challenge.status, newStatus: 'EVALUATION' },
    ip_address
  });

  await sendNotification({
    user_id: user.id,
    title: 'Evaluation Stage Started',
    message: `Problem Statement "${challenge.title}" has entered the EVALUATION stage. Proposal review and evaluator scoring are now officially authorized.`,
    type: 'CHALLENGE_EVALUATION_STARTED',
    link: `/government/challenges/${id}/applications`
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

  await sendNotification({
    user_id: user.id,
    title: 'Problem Statement Closed',
    message: `Problem Statement "${challenge.title}" is now CLOSED. Candidate pool and new participation are frozen.`,
    type: 'CHALLENGE_CLOSED',
    link: `/government/challenges/${id}/applications`
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
  return getAuthoritativeChallengeMatches(challengeId, user);
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

/**
 * Shortlist a startup for a Problem Statement / Challenge
 * 
 * Rules:
 * - Must be authorized GOVERNMENT (assigned department) or ADMIN
 * - Challenge must exist and be open (cannot shortlist if CLOSED or DRAFT)
 * - Startup must exist and have an evaluated MatchScore record
 * - Startup must NOT be INELIGIBLE
 * - Startup must NOT already be shortlisted (prevents duplicate state/notifications)
 * - Updates persistent state in MatchScore.ai_reasoning
 * - Synchronizes Application status to SHORTLISTED if an application exists
 * - Logs audit trail (STARTUP_SHORTLISTED)
 * - Sends in-app notification and email to shortlisted startup
 */
export const shortlistStartup = async (challengeId, startupId, user, ip_address = null, notes = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT within the same department
  if (user.role === 'ADMIN') {
    // Admin has cross-department management authorization
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only shortlist startups for challenges belonging to your assigned department.');
    }
  } else {
    throw new ForbiddenError('You are not authorized to shortlist startups.');
  }

  // State validation: Challenge must be open
  if (challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot shortlist startups for a closed problem statement. Candidate pool is frozen.');
  }
  if (challenge.status === 'DRAFT') {
    throw new BadRequestError('Cannot shortlist startups for a draft problem statement. Problem statement must be published first.');
  }

  // Startup validation
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  // Match record validation
  const matchScore = await prisma.matchScore.findUnique({
    where: {
      challenge_id_startup_id: {
        challenge_id: challengeId,
        startup_id: startupId
      }
    }
  });

  if (!matchScore) {
    throw new NotFoundError(`Startup "${startup.company_name}" does not have a match score record for challenge ${challengeId}.`);
  }

  // Parse existing AI reasoning / metadata
  let parsedReasoning = {};
  if (matchScore.ai_reasoning) {
    try {
      parsedReasoning = typeof matchScore.ai_reasoning === 'string'
        ? JSON.parse(matchScore.ai_reasoning)
        : matchScore.ai_reasoning;
    } catch {}
  }

  // Eligibility validation: Cannot shortlist an INELIGIBLE startup
  const eligibilityStatus = parsedReasoning.eligibility_status || (parsedReasoning.is_eligible === false ? 'INELIGIBLE' : 'ELIGIBLE');
  if (eligibilityStatus === 'INELIGIBLE') {
    const reasons = parsedReasoning.ineligibility_reasons?.join('; ') || 'Startup does not satisfy mandatory challenge eligibility requirements.';
    throw new BadRequestError(`Cannot shortlist an ineligible startup. Reason: ${reasons}`);
  }

  // Check if an application already exists for this challenge + startup
  const existingApp = await prisma.application.findUnique({
    where: {
      challenge_id_startup_id: {
        challenge_id: challengeId,
        startup_id: startupId
      }
    }
  });

  // Duplicate prevention: check both MatchScore and Application
  if (parsedReasoning.is_shortlisted || existingApp?.status === 'SHORTLISTED') {
    return {
      challenge_id: challengeId,
      application_id: existingApp?.id || null,
      startup_id: startupId,
      startup_name: startup.company_name,
      application_status: 'SHORTLISTED',
      is_shortlisted: true,
      shortlisted_at: parsedReasoning.shortlisted_at || existingApp?.updated_at?.toISOString() || new Date().toISOString(),
      shortlisted_by: parsedReasoning.shortlisted_by || user.id,
      notes: notes || parsedReasoning.shortlist_notes || null,
      message: `Startup "${startup.company_name}" is already shortlisted for this problem statement.`
    };
  }

  const shortlistedAt = new Date().toISOString();
  const updatedReasoning = {
    ...parsedReasoning,
    is_shortlisted: true,
    shortlisted_at: shortlistedAt,
    shortlisted_by: user.id,
    shortlist_notes: notes || null
  };

  // Persist shortlist state inside Prisma transaction
  const savedApp = await prisma.$transaction(async (tx) => {
    // 1. Update MatchScore record
    await tx.matchScore.update({
      where: {
        challenge_id_startup_id: {
          challenge_id: challengeId,
          startup_id: startupId
        }
      },
      data: {
        ai_reasoning: JSON.stringify(updatedReasoning)
      }
    });

    // 2. Persist Application record with status = SHORTLISTED
    let app = await tx.application.findUnique({
      where: {
        challenge_id_startup_id: {
          challenge_id: challengeId,
          startup_id: startupId
        }
      }
    });

    if (app) {
      app = await tx.application.update({
        where: { id: app.id },
        data: { status: 'SHORTLISTED' }
      });
    } else {
      app = await tx.application.create({
        data: {
          challenge_id: challengeId,
          startup_id: startupId,
          proposal: `Discovered and shortlisted via Government Problem Statement Discovery & Evaluation. Overall Match Score: ${matchScore.overall_score}%.`,
          technical_approach: startup.solution_summary || (startup.technologies?.length ? startup.technologies.join(', ') : 'Verified Technical Capability'),
          expected_impact: `Government candidate evaluation: ${startup.company_name} aligns with challenge requirements in ${startup.domain || 'domain'}.`,
          estimated_cost: 0,
          timeline: 'Candidate Evaluation',
          status: 'SHORTLISTED',
          submitted_at: new Date()
        }
      });
    }

    return app;
  });

  // Audit logging
  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_SHORTLISTED',
    entity_type: 'CHALLENGE',
    entity_id: challengeId,
    details: {
      startup_id: startupId,
      startup_name: startup.company_name,
      application_id: savedApp.id,
      overall_score: matchScore.overall_score,
      eligibility_status: eligibilityStatus,
      has_application: true,
      notes
    },
    ip_address
  });

  // Step 8: In-app Notification for shortlisted startup
  if (startup.user_id) {
    await sendNotification({
      user_id: startup.user_id,
      title: 'Startup Shortlisted',
      message: `Congratulations! Your startup has been shortlisted for the Problem Statement '${challenge.title}'. Please check your SetuGov dashboard for the next steps.`,
      type: 'SHORTLISTED',
      link: `/startup/challenges/${challengeId}`
    });
  }

  // Step 8: Email Notification for shortlisted startup
  if (startup.user?.email) {
    try {
      await sendEmail({
        to: startup.user.email,
        subject: `Shortlisted: Problem Statement '${challenge.title}' - SetuGov`,
        text: `Dear ${startup.company_name},\n\nCongratulations! Your startup has been shortlisted for the Problem Statement '${challenge.title}'. Please check your SetuGov dashboard for the next steps.\n\nNote: Shortlisting represents advancement to the candidate evaluation stage and does not constitute a final pilot or procurement award.\n\nSetuGov Team`,
        html: `<p>Dear <strong>${startup.company_name}</strong>,</p><p>Congratulations! Your startup has been shortlisted for the Problem Statement '<strong>${challenge.title}</strong>'.</p><p>Please check your SetuGov dashboard for the next steps.</p><p style="color: #64748b; font-size: 12px;"><em>Note: Shortlisting represents advancement to the candidate evaluation stage and does not constitute a final pilot or procurement award.</em></p><p>Regards,<br/>SetuGov Team</p>`
      });
    } catch (emailErr) {
      logger.warn(`Shortlist email notification failed for ${startup.user.email}: ${emailErr.message}`);
    }
  }

  return {
    challenge_id: challengeId,
    application_id: savedApp.id,
    startup_id: startupId,
    startup_name: startup.company_name,
    application_status: savedApp.status,
    is_shortlisted: true,
    shortlisted_at: shortlistedAt,
    shortlisted_by: user.id,
    notes: notes || null,
    message: `Startup "${startup.company_name}" has been successfully shortlisted.`
  };
};

/**
 * Generate Brain 1 advisory assistance for an existing DRAFT challenge.
 * Decoupled from challenge creation so AI unavailability never prevents challenge persistence.
 */
export const generateChallengeBrain1 = async (id, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${id} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT within the same department
  if (user.role === 'ADMIN') {
    // Admin has cross-department management authorization
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only generate AI assistance for challenges belonging to your assigned department.');
    }
  } else {
    throw new ForbiddenError('You are not authorized to generate AI assistance for this challenge.');
  }

  // Brain 1 enhancement only permitted on DRAFT challenges
  if (challenge.status !== 'DRAFT') {
    throw new BadRequestError(`Cannot run Brain 1 enhancement on challenge in '${challenge.status}' status. Only DRAFT challenges can be enhanced.`);
  }

  const input = {
    problem: {
      title: challenge.title,
      description: challenge.problem_description,
      baseline: challenge.current_baseline
    },
    outcome: {
      desired_outcome: challenge.desired_outcome
    },
    pilot: {
      duration: `${challenge.pilot_duration_days} days`,
      sites: [challenge.location],
      budget: `${challenge.budget_max} INR`
    },
    requirements: {
      technologies: challenge.required_technologies || [],
      domain: challenge.department?.name || 'General'
    }
  };

  const brain1Result = await aiService.generateChallenge(input);

  if (brain1Result.status === 'UNAVAILABLE') {
    await createAuditLog({
      user_id: user.id,
      action: 'BRAIN1_GENERATION_FAILED',
      entity_type: 'CHALLENGE',
      entity_id: challenge.id,
      details: { reason: brain1Result.message || 'AI service unavailable' },
      ip_address
    });

    return {
      challenge_id: challenge.id,
      status: 'UNAVAILABLE',
      success: false,
      message: 'AI assistance is currently unavailable. You can continue manually.'
    };
  }

  await createAuditLog({
    user_id: user.id,
    action: 'BRAIN1_GENERATION_SUCCEEDED',
    entity_type: 'CHALLENGE',
    entity_id: challenge.id,
    details: { mode: brain1Result.ai_metadata?.mode || 'live' },
    ip_address
  });

  return {
    challenge_id: challenge.id,
    status: 'AVAILABLE',
    success: true,
    data: brain1Result,
    ...brain1Result
  };
};

export const getChallengeEligibility = async (challengeId, user) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      department: {
        select: { id: true, name: true, state: true }
      },
      eligibility_review: {
        include: {
          reviewer: {
            select: { id: true, name: true, role: true }
          }
        }
      }
    }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // Authorization: GOVERNMENT role is restricted to their own department's challenges
  if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You do not have permission to view eligibility for challenges from other departments.');
    }
  } else if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Only government officials and administrators can access challenge eligibility reviews.');
  }

  const review = challenge.eligibility_review;

  // If a saved review exists, return the saved checks and decision
  if (review) {
    return {
      challenge_id: challenge.id,
      challenge_title: challenge.title,
      department: challenge.department,
      status: challenge.status,
      decision: review.decision,
      remarks: review.remarks || '',
      checks: Array.isArray(review.checks) ? review.checks : [],
      reviewed_at: review.reviewed_at,
      reviewer: review.reviewer,
      has_review: true
    };
  }

  // Otherwise, synthesize initial checks strictly from configured eligibility requirements and documents
  const reqs = Array.isArray(challenge.eligibility_requirements)
    ? challenge.eligibility_requirements
    : typeof challenge.eligibility_requirements === 'string' && challenge.eligibility_requirements.trim()
    ? [{ id: 'req-1', title: 'Eligibility Criteria', description: challenge.eligibility_requirements, required: true }]
    : [];

  const initialChecks = [];

  if (reqs.length > 0) {
    reqs.forEach((req, idx) => {
      if (typeof req === 'string') {
        initialChecks.push({
          id: `req-${idx + 1}`,
          title: req,
          description: `Configured requirement for ${challenge.title}`,
          status: 'PENDING',
          required: true
        });
      } else if (req && typeof req === 'object') {
        initialChecks.push({
          id: req.id || `req-${idx + 1}`,
          title: req.title || req.name || `Requirement ${idx + 1}`,
          description: req.description || req.details || 'Configured eligibility criterion',
          status: 'PENDING',
          required: req.required !== false
        });
      }
    });
  }

  // Also include required documents if specified on the challenge
  if (Array.isArray(challenge.required_documents) && challenge.required_documents.length > 0) {
    challenge.required_documents.forEach((doc, idx) => {
      const docTitle = typeof doc === 'string' ? doc : (doc.title || doc.name || `Document ${idx + 1}`);
      const docDesc = typeof doc === 'object' && doc.description ? doc.description : 'Required statutory / technical document';
      initialChecks.push({
        id: `doc-${idx + 1}`,
        title: `Document: ${docTitle}`,
        description: docDesc,
        status: 'PENDING',
        required: true
      });
    });
  }

  // Also include cybersecurity requirements if specified on challenge
  if (challenge.cybersecurity_requirements && challenge.cybersecurity_requirements.trim()) {
    initialChecks.push({
      id: 'cybersecurity',
      title: 'Cybersecurity & Compliance',
      description: challenge.cybersecurity_requirements.trim(),
      status: 'PENDING',
      required: true
    });
  }

  // Also include data compliance if specified on challenge
  if (challenge.data_compliance && challenge.data_compliance.trim()) {
    initialChecks.push({
      id: 'data-compliance',
      title: 'Data Privacy & Regulatory Compliance',
      description: challenge.data_compliance.trim(),
      status: 'PENDING',
      required: true
    });
  }

  return {
    challenge_id: challenge.id,
    challenge_title: challenge.title,
    department: challenge.department,
    status: challenge.status,
    decision: 'PENDING',
    remarks: '',
    checks: initialChecks,
    reviewed_at: null,
    reviewer: null,
    has_review: false
  };
};

export const saveChallengeEligibility = async (challengeId, data, user, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // Authorization: GOVERNMENT role must match assigned department
  if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only review eligibility for challenges belonging to your assigned department.');
    }
  } else if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Only government officials and administrators can save challenge eligibility reviews.');
  }

  // Canonical normalization of checks
  const normalizedChecks = (data.checks || []).map((c, idx) => {
    const rawStatus = String(c.status || 'PENDING').toUpperCase();
    let status = 'PENDING';
    if (rawStatus === 'PASSED' || rawStatus === 'PASS' || rawStatus === 'COMPLIANT' || rawStatus === 'ELIGIBLE') {
      status = 'PASSED';
    } else if (rawStatus === 'FAILED' || rawStatus === 'FAIL' || rawStatus === 'NON_COMPLIANT' || rawStatus === 'INELIGIBLE') {
      status = 'FAILED';
    }

    return {
      id: c.id || `check-${idx + 1}`,
      title: c.title || c.name || `Check ${idx + 1}`,
      description: c.description || '',
      status,
      required: c.required !== false
    };
  });

  // Canonical normalization of decision
  const rawDec = String(data.decision || 'PENDING').toUpperCase();
  let normalizedDecision = 'PENDING';
  if (rawDec === 'ELIGIBLE' || rawDec === 'PASSED' || rawDec === 'APPROVED') {
    normalizedDecision = 'ELIGIBLE';
  } else if (rawDec === 'CLARIFICATION' || rawDec === 'NEEDS_REVIEW' || rawDec === 'PENDING_CLARIFICATION') {
    normalizedDecision = 'CLARIFICATION';
  } else if (rawDec === 'NOT_ELIGIBLE' || rawDec === 'INELIGIBLE' || rawDec === 'REJECTED' || rawDec === 'FAILED') {
    normalizedDecision = 'NOT_ELIGIBLE';
  }

  const review = await prisma.challengeEligibilityReview.upsert({
    where: { challenge_id: challengeId },
    create: {
      challenge_id: challengeId,
      reviewed_by: user.id,
      decision: normalizedDecision,
      remarks: data.remarks ? data.remarks.trim() : null,
      checks: normalizedChecks
    },
    update: {
      reviewed_by: user.id,
      decision: normalizedDecision,
      remarks: data.remarks ? data.remarks.trim() : null,
      checks: normalizedChecks
    },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          role: true,
          email: true
        }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'CHALLENGE_ELIGIBILITY_REVIEWED',
    entity_type: 'CHALLENGE',
    entity_id: challengeId,
    details: {
      decision: normalizedDecision,
      checks_count: normalizedChecks.length,
      passed_count: normalizedChecks.filter(c => c.status === 'PASSED').length,
      failed_count: normalizedChecks.filter(c => c.status === 'FAILED').length,
      pending_count: normalizedChecks.filter(c => c.status === 'PENDING').length
    },
    ip_address
  });

  return review;
};

export default {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  publishChallenge,
  startChallengeEvaluation,
  closeChallenge,
  transitionChallengeStatus,
  shortlistStartup,
  getChallengeApplications,
  getChallengeMatches,
  getChallengePilot,
  generateChallengeBrain1,
  getChallengeEligibility,
  saveChallengeEligibility
};