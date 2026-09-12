import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';

/**
 * List evaluators with optional filtering by domain, verification status, and search query.
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
  if (verification_status) where.verification_status = verification_status;
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
  const profile = await prisma.evaluatorProfile.findUnique({
    where: { id: profileId },
    include: { user: true }
  });

  if (!profile) {
    throw new NotFoundError(`Evaluator profile with ID ${profileId} not found.`);
  }

  const updatedProfile = await prisma.$transaction(async (tx) => {
    const p = await tx.evaluatorProfile.update({
      where: { id: profileId },
      data: {
        verification_status: data.verification_status,
        verified_by: adminUser.id,
        verified_at: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, is_verified: true }
        }
      }
    });

    // If verified, mark user is_verified = true
    if (data.verification_status === 'VERIFIED') {
      await tx.user.update({
        where: { id: profile.user_id },
        data: { is_verified: true }
      });
    }

    return p;
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: `EVALUATOR_${data.verification_status}`,
    entity_type: 'EVALUATOR_PROFILE',
    entity_id: profileId,
    details: {
      previousStatus: profile.verification_status,
      newStatus: data.verification_status,
      evaluator_email: profile.user.email
    },
    ip_address
  });

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
 * Nominate / Invite an Evaluator
 */
export const nominateEvaluator = async (data, currentUser, ip_address = null) => {
  const { email, name, organization, designation, domain_expertise } = data;

  const normalizedEmail = email.trim().toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    // Return nomination info for invitation
    return {
      nominated: true,
      email: normalizedEmail,
      name: name?.trim() || null,
      organization: organization?.trim() || null,
      designation: designation?.trim() || null,
      domain_expertise: Array.isArray(domain_expertise) ? domain_expertise : [domain_expertise],
      message: `Nomination recorded. An invitation link can be dispatched to ${normalizedEmail}.`
    };
  }

  // If user exists, ensure they have Evaluator role or create EvaluatorProfile
  const expertise = Array.isArray(domain_expertise)
    ? domain_expertise
    : (domain_expertise ? [domain_expertise] : ['General Innovation']);

  const profile = await prisma.evaluatorProfile.upsert({
    where: { user_id: user.id },
    create: {
      user_id: user.id,
      organization: organization?.trim() || 'Nominated Organization',
      designation: designation?.trim() || 'Evaluator Expert',
      domain_expertise: expertise,
      verification_status: 'VERIFIED',
      verified_by: currentUser.id,
      verified_at: new Date()
    },
    update: {
      domain_expertise: expertise,
      verification_status: 'VERIFIED',
      verified_by: currentUser.id,
      verified_at: new Date()
    }
  });

  await createAuditLog({
    user_id: currentUser.id,
    action: 'EVALUATOR_NOMINATED',
    entity_type: 'EVALUATOR_PROFILE',
    entity_id: profile.id,
    details: { nominated_user_id: user.id, email: normalizedEmail },
    ip_address
  });

  await sendNotification({
    user_id: user.id,
    title: 'Evaluator Registry Nomination',
    message: `You have been nominated and verified as an innovation evaluator by ${currentUser.name}.`,
    type: 'EVALUATOR_NOMINATED',
    link: '/evaluator/dashboard'
  });

  return profile;
};

export default {
  getEvaluators,
  getEvaluatorProfile,
  createOrUpdateEvaluatorProfile,
  verifyEvaluator,
  nominateEvaluator
};
