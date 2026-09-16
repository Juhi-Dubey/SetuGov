import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification, notifyEvaluatorAssigned } from './notificationService.js';
import { createGovernmentNomination } from './accessRequestService.js';

/**
 * List evaluators with optional filtering by domain, verification status, and search query.
 * For Government officers: strictly limits to VERIFIED and active evaluators.
 */
export const getEvaluators = async (query = {}, currentUser = null) => {
  const {
    domain,
    verification_status,
    search,
    page = 1,
    limit = 20
  } = query;

  const where = {};

  if (currentUser?.role === 'GOVERNMENT') {
    // Government users can strictly ONLY view and select VERIFIED and active evaluators
    where.verification_status = 'VERIFIED';
    where.user = { is_active: true };
  } else {
    if (verification_status) where.verification_status = verification_status;
  }

  if (domain) {
    where.domain_expertise = { has: domain };
  }

  if (search) {
    where.OR = [
      { organization: { contains: search, mode: 'insensitive' } },
      { designation: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  const [total, evaluators] = await Promise.all([
    prisma.evaluatorProfile.count({ where }),
    prisma.evaluatorProfile.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            is_active: true,
            is_verified: true
          }
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  ]);

  return {
    evaluators,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

/**
 * Get evaluator profile by User ID or Profile ID
 */
export const getEvaluatorProfile = async (identifier, currentUser = null) => {
  const profile = await prisma.evaluatorProfile.findFirst({
    where: {
      OR: [
        { id: identifier },
        { user_id: identifier }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          is_active: true,
          is_verified: true
        }
      },
      verifier: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!profile) {
    throw new NotFoundError(`Evaluator profile for ID ${identifier} not found.`);
  }

  return profile;
};

/**
 * Create or update evaluator profile for authenticated user
 */
export const createOrUpdateEvaluatorProfile = async (data, user, ip_address = null) => {
  const existing = await prisma.evaluatorProfile.findUnique({
    where: { user_id: user.id }
  });

  const domain_expertise = Array.isArray(data.domain_expertise)
    ? data.domain_expertise
    : (data.domain_expertise ? data.domain_expertise.split(',').map(s => s.trim()) : []);

  let profile;
  if (existing) {
    profile = await prisma.evaluatorProfile.update({
      where: { user_id: user.id },
      data: {
        organization: data.organization !== undefined ? data.organization.trim() : existing.organization,
        designation: data.designation !== undefined ? data.designation.trim() : existing.designation,
        employment_type: data.employment_type !== undefined ? data.employment_type : existing.employment_type,
        domain_expertise: domain_expertise.length > 0 ? domain_expertise : existing.domain_expertise,
        years_experience: data.years_experience !== undefined ? parseInt(data.years_experience, 10) : existing.years_experience,
        bio: data.bio !== undefined ? data.bio.trim() : existing.bio
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, is_verified: true }
        }
      }
    });

    await createAuditLog({
      user_id: user.id,
      action: 'EVALUATOR_PROFILE_UPDATED',
      entity_type: 'EVALUATOR_PROFILE',
      entity_id: profile.id,
      details: { organization: profile.organization, designation: profile.designation },
      ip_address
    });
  } else {
    profile = await prisma.evaluatorProfile.create({
      data: {
        user_id: user.id,
        organization: data.organization ? data.organization.trim() : 'Independent Evaluator',
        designation: data.designation ? data.designation.trim() : 'Domain Specialist',
        employment_type: data.employment_type || 'INDEPENDENT',
        domain_expertise: domain_expertise.length > 0 ? domain_expertise : ['General Innovation'],
        years_experience: data.years_experience ? parseInt(data.years_experience, 10) : 1,
        bio: data.bio ? data.bio.trim() : null,
        verification_status: 'PENDING'
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, is_verified: true }
        }
      }
    });

    await createAuditLog({
      user_id: user.id,
      action: 'EVALUATOR_PROFILE_CREATED',
      entity_type: 'EVALUATOR_PROFILE',
      entity_id: profile.id,
      details: { organization: profile.organization, designation: profile.designation },
      ip_address
    });
  }

  return profile;
};

/**
 * Admin verifies or rejects an evaluator profile
 */
export const verifyEvaluator = async (profileId, data, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators are authorized to verify evaluator profiles.');
  }

  if (!data.verification_status || !['VERIFIED', 'REJECTED', 'PENDING'].includes(data.verification_status)) {
    throw new BadRequestError('Invalid verification status. Must be VERIFIED, REJECTED, or PENDING.');
  }

  const profile = await prisma.evaluatorProfile.findUnique({
    where: { id: profileId },
    include: { user: true }
  });

  if (!profile) {
    throw new NotFoundError(`Evaluator profile with ID ${profileId} not found.`);
  }

  // Duplicate verification prevention (Task O)
  if (profile.verification_status === data.verification_status) {
    throw new BadRequestError(`Evaluator profile is already ${data.verification_status}.`);
  }

  // Task N: Evaluator verification guard before invitation acceptance
  // Keep professional credential verification separate from account activation (Task M)
  if (profile.user && !profile.user.invitation_accepted_at && !profile.user.is_active) {
    throw new BadRequestError(
      'Cannot verify evaluator credentials before the evaluator has accepted their invitation and activated their account.'
    );
  }

  const verifyStartedAt = Date.now();
  let updatedProfile;

  try {
    updatedProfile = await prisma.$transaction(async (tx) => {
      const txStart = Date.now();

      // Concurrency protection: re-check status inside tx (Task O)
      const current = await tx.evaluatorProfile.findUnique({
        where: { id: profileId }
      });
      if (!current) {
        throw new NotFoundError(`Evaluator profile with ID ${profileId} not found.`);
      }
      if (current.verification_status === data.verification_status) {
        throw new BadRequestError(`Evaluator profile is already ${data.verification_status}.`);
      }

      // Step 1: evaluatorProfile.update (Task B diagnostic timing)
      const evalUpdateStart = Date.now();
      const p = await tx.evaluatorProfile.update({
        where: { id: profileId },
        data: {
          verification_status: data.verification_status,
          verified_by: adminUser.id,
          verified_at: new Date()
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, is_active: true, is_verified: true }
          }
        }
      });
      console.info(`[VERIFY_EVALUATOR] evaluatorProfile.update: ${Date.now() - evalUpdateStart}ms`);

      // Step 2: user.update when verification_status === VERIFIED (Task B diagnostic timing)
      // Preserves is_active state — does NOT prematurely activate the account (Task M)
      if (data.verification_status === 'VERIFIED') {
        const userUpdateStart = Date.now();
        await tx.user.update({
          where: { id: profile.user_id },
          data: { is_verified: true }
        });
        console.info(`[VERIFY_EVALUATOR] user.update when verification_status === VERIFIED: ${Date.now() - userUpdateStart}ms`);
      }

      // Step 3: Atomic audit log inside tx (Task F)
      const auditStart = Date.now();
      await createAuditLog({
        tx,
        user_id: adminUser.id,
        action: `EVALUATOR_${data.verification_status}`,
        entity_type: 'EVALUATOR_PROFILE',
        entity_id: profileId,
        details: {
          previousStatus: profile.verification_status,
          newStatus: data.verification_status,
          evaluator_email: profile.user?.email
        },
        ip_address
      });
      console.info(`[VERIFY_EVALUATOR] auditLog: ${Date.now() - auditStart}ms`);
      console.info(`[VERIFY_EVALUATOR] total transaction duration: ${Date.now() - txStart}ms`);

      return p;
    }, {
      // Task C: Explicit transaction configuration to prevent default 5000ms timeout
      maxWait: 10000,
      timeout: 15000
    });
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('Transaction already closed') || msg.includes('transaction was expired')) {
      throw new Error(
        'Database transaction timed out during evaluator verification. Please retry.'
      );
    }
    throw err;
  }

  // Post-commit: Notification strictly outside the transaction (Task E)
  await sendNotification({
    user_id: profile.user_id,
    title: `Evaluator Registry: ${data.verification_status}`,
    message: `Your evaluator credentials have been reviewed and marked as ${data.verification_status}.`,
    type: 'EVALUATOR_VERIFIED',
    link: '/evaluator/dashboard'
  });

  return updatedProfile;
};

/**
 * Government officer or Admin nominates an Evaluator.
 * Crucial Rule: Routes through createGovernmentNomination to create a PENDING AccessRequest.
 * Does NOT directly verify the evaluator.
 */
export const nominateEvaluator = async (data, currentUser, ip_address = null) => {
  return createGovernmentNomination(data, currentUser, ip_address);
};

/**
 * Government / Admin assigns a verified evaluator to an application
 */
export const assignEvaluatorToApplication = async (applicationId, data, currentUser, ip_address = null) => {
  if (currentUser.role !== 'GOVERNMENT' && currentUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can assign evaluators to applications.');
  }

  const { evaluator_id, notes } = data;
  if (!evaluator_id) {
    throw new BadRequestError('evaluator_id is required for assignment.');
  }

  // 1. Verify Application
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      challenge: {
        include: { department: true }
      },
      startup: true
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  // Enforce CLOSED challenge freeze
  if (application.challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot assign evaluators: Problem Statement is CLOSED.');
  }

  if (application.status !== 'SUBMITTED' && application.status !== 'SHORTLISTED') {
    throw new BadRequestError(`Cannot assign evaluator to application in '${application.status}' status. Application must be SUBMITTED or SHORTLISTED.`);
  }

  // Check Department isolation
  if (currentUser.role === 'GOVERNMENT') {
    if (currentUser.department_id && application.challenge.department_id !== currentUser.department_id) {
      throw new ForbiddenError('You can only assign evaluators to applications within your assigned department.');
    }
  }

  // 2. Verify Evaluator is officially VERIFIED and active
  const evaluatorUser = await prisma.user.findUnique({
    where: { id: evaluator_id },
    include: { evaluator_profile: true }
  });

  if (!evaluatorUser || evaluatorUser.role !== 'EVALUATOR') {
    throw new BadRequestError('Specified user is not registered as an Evaluator.');
  }

  if (!evaluatorUser.is_active) {
    throw new BadRequestError('Cannot assign inactive evaluator.');
  }

  if (!evaluatorUser.is_verified || evaluatorUser.evaluator_profile?.verification_status !== 'VERIFIED') {
    throw new ForbiddenError('Cannot assign unverified evaluator. Evaluators must be verified by an Administrator before assignment.');
  }

  // 2b. Governance gate: Evaluator must belong to Challenge-specific Final Evaluator Pool
  const poolEntry = await prisma.challengeEvaluatorPool.findUnique({
    where: {
      challenge_id_evaluator_id: {
        challenge_id: application.challenge_id,
        evaluator_id
      }
    }
  });

  if (!poolEntry) {
    throw new BadRequestError('Evaluator assignment cannot bypass Final Evaluator Pool. Evaluator must be added to the Challenge Final Evaluator Pool before assignment.');
  }

  // 3. Prevent corrupting historical assignment lifecycle (Part 6)
  const existingAssignment = await prisma.evaluatorAssignment.findUnique({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id
      }
    }
  });

  if (existingAssignment) {
    if (existingAssignment.status === 'COMPLETED') {
      throw new BadRequestError('Cannot reassign an evaluator whose evaluation assignment is already COMPLETED.');
    }
    if (existingAssignment.status === 'RECUSED') {
      throw new BadRequestError('Cannot reassign an evaluator who has RECUSED themselves due to a conflict of interest.');
    }
  }

  // 4. Create or update assignment
  const assignment = await prisma.evaluatorAssignment.upsert({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id
      }
    },
    create: {
      application_id: applicationId,
      evaluator_id,
      assigned_by: currentUser.id,
      status: 'PENDING',
      notes: notes ? notes.trim() : null,
      assigned_at: new Date()
    },
    update: {
      assigned_by: currentUser.id,
      status: existingAssignment?.status === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING',
      notes: notes ? notes.trim() : existingAssignment?.notes,
      assigned_at: new Date()
    },
    include: {
      evaluator: {
        select: { id: true, name: true, email: true, role: true }
      },
      assigner: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  await createAuditLog({
    user_id: currentUser.id,
    action: 'EVALUATOR_ASSIGNED',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    details: {
      application_id: applicationId,
      challenge_id: application.challenge_id,
      evaluator_id,
      evaluator_name: evaluatorUser.name
    },
    ip_address
  });

  // Notify Evaluator with transactional email
  await notifyEvaluatorAssigned({
    assignmentId: assignment.id,
    applicationId,
    evaluatorId: evaluator_id,
    challengeId: application.challenge_id,
    challengeTitle: application.challenge?.title,
    startupName: application.startup?.company_name
  });

  return assignment;
};

/**
 * Get all assignments for the currently authenticated Evaluator
 */
export const getMyAssignments = async (user, query = {}) => {
  if (user.role !== 'EVALUATOR' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only evaluators can access their personal assignment registry.');
  }

  const { status, search } = query;
  const where = { evaluator_id: user.id };
  if (status && status !== 'All') {
    where.status = status;
  }

  const assignments = await prisma.evaluatorAssignment.findMany({
    where,
    orderBy: { assigned_at: 'desc' },
    include: {
      application: {
        include: {
          challenge: {
            include: {
              department: {
                select: { id: true, name: true, state: true }
              }
            }
          },
          startup: {
            select: {
              id: true,
              company_name: true,
              domain: true,
              technologies: true,
              readiness_level: true,
              location: true
            }
          },
          evaluations: {
            where: { evaluator_id: user.id }
          },
          conflict_declarations: {
            where: { evaluator_id: user.id }
          }
        }
      },
      assigner: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return assignments.map(a => {
    const myEval = a.application?.evaluations?.[0] || null;
    const myConflict = a.application?.conflict_declarations?.[0] || null;

    return {
      id: a.id,
      assignment_id: a.id,
      application_id: a.application_id,
      challenge_id: a.application?.challenge_id,
      challenge_title: a.application?.challenge?.title,
      startup_id: a.application?.startup_id,
      startup_name: a.application?.startup?.company_name,
      domain: a.application?.startup?.domain,
      department_name: a.application?.challenge?.department?.name,
      state: a.application?.challenge?.department?.state,
      assigned_at: a.assigned_at,
      status: a.status,
      notes: a.notes,
      is_evaluated: Boolean(myEval),
      evaluation_total_score: myEval?.total_score || null,
      has_conflict: Boolean(myConflict?.has_conflict),
      is_recused: Boolean(myConflict?.is_recused),
      proposal_summary: a.application?.proposal,
      technical_approach: a.application?.technical_approach
    };
  });
};

/**
 * Evaluator updates assignment status (e.g. ACCEPTED, DECLINED, RECUSED)
 */
export const updateAssignmentStatus = async (assignmentId, data, user, ip_address = null) => {
  const { status, notes } = data;

  if (!['ACCEPTED', 'DECLINED', 'RECUSED'].includes(status)) {
    throw new BadRequestError('Invalid assignment status. Valid status: ACCEPTED, DECLINED, RECUSED.');
  }

  const assignment = await prisma.evaluatorAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      application: {
        include: { challenge: true, startup: true }
      }
    }
  });

  if (!assignment) {
    throw new NotFoundError(`Assignment with ID ${assignmentId} not found.`);
  }

  if (user.role !== 'ADMIN' && assignment.evaluator_id !== user.id) {
    throw new ForbiddenError('You can only update your own assigned evaluations.');
  }

  const updateData = { status };
  if (status === 'ACCEPTED') {
    updateData.accepted_at = new Date();
  }
  if (notes) {
    updateData.notes = notes.trim();
  }

  const updated = await prisma.evaluatorAssignment.update({
    where: { id: assignmentId },
    data: updateData,
    include: {
      application: {
        include: { challenge: true, startup: true }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: `EVALUATOR_ASSIGNMENT_${status}`,
    entity_type: 'EVALUATOR_ASSIGNMENT',
    entity_id: assignmentId,
    details: {
      application_id: assignment.application_id,
      challenge_id: assignment.application?.challenge_id,
      evaluator_id: user.id,
      new_status: status
    },
    ip_address
  });

  // Notify challenge creator / assigner
  if (assignment.application?.challenge?.created_by) {
    await sendNotification({
      user_id: assignment.application.challenge.created_by,
      title: `Evaluator Assignment ${status}`,
      message: `Evaluator ${user.name} has marked assignment as ${status} for "${assignment.application?.startup?.company_name}".`,
      type: 'ASSIGNMENT_UPDATED',
      link: `/government/challenges/${assignment.application.challenge_id}/applications`
    });
  }

  return updated;
};

/**
 * Get all assignments for an application (Government / Admin)
 */
export const getApplicationAssignments = async (applicationId, user) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { challenge: true }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  if (user.role === 'GOVERNMENT' && user.department_id && application.challenge.department_id !== user.department_id) {
    throw new ForbiddenError('You can only view assignments for applications belonging to your assigned department.');
  }

  const assignments = await prisma.evaluatorAssignment.findMany({
    where: { application_id: applicationId },
    include: {
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          evaluator_profile: true
        }
      },
      assigner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { assigned_at: 'desc' }
  });

  return assignments;
};

export default {
  getEvaluators,
  getEvaluatorProfile,
  createOrUpdateEvaluatorProfile,
  verifyEvaluator,
  nominateEvaluator,
  assignEvaluatorToApplication,
  getMyAssignments,
  updateAssignmentStatus,
  getApplicationAssignments
};
