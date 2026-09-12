import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';

export const getDashboardOverview = async () => {
  const [
    totalUsers,
    usersByRole,
    totalDepartments,
    departmentsByVerification,
    totalChallenges,
    challengesByStatus,
    totalStartups,
    startupsByVerification,
    totalEvaluators,
    evaluatorsByVerification,
    totalApplications,
    applicationsByStatus,
    totalPilots,
    pilotsByStatus,
    recentAuditLogs
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    }),
    prisma.department.count(),
    prisma.department.groupBy({
      by: ['verification_status'],
      _count: { id: true }
    }),
    prisma.challenge.count(),
    prisma.challenge.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.startup.count(),
    prisma.startup.groupBy({
      by: ['verification_status'],
      _count: { id: true }
    }),
    prisma.evaluatorProfile.count(),
    prisma.evaluatorProfile.groupBy({
      by: ['verification_status'],
      _count: { id: true }
    }),
    prisma.application.count(),
    prisma.application.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.pilot.count(),
    prisma.pilot.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.auditLog.findMany({
      take: 15,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })
  ]);

  const pendingGovt = departmentsByVerification.find(d => d.verification_status === 'PENDING')?._count?.id || 0;
  const pendingStartups = startupsByVerification.find(s => s.verification_status === 'PENDING')?._count?.id || 0;
  const pendingEvaluators = evaluatorsByVerification.find(e => e.verification_status === 'PENDING')?._count?.id || 0;

  return {
    summary: {
      totalUsers,
      totalDepartments,
      totalChallenges,
      totalStartups,
      totalEvaluators,
      totalApplications,
      totalPilots,
      pendingVerifications: {
        government: pendingGovt,
        startups: pendingStartups,
        evaluators: pendingEvaluators,
        total: pendingGovt + pendingStartups + pendingEvaluators
      }
    },
    usersBreakdown: usersByRole.reduce((acc, curr) => {
      acc[curr.role] = curr._count.id;
      return acc;
    }, {}),
    departmentsBreakdown: departmentsByVerification.reduce((acc, curr) => {
      acc[curr.verification_status] = curr._count.id;
      return acc;
    }, {}),
    challengesBreakdown: challengesByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {}),
    startupsBreakdown: startupsByVerification.reduce((acc, curr) => {
      acc[curr.verification_status] = curr._count.id;
      return acc;
    }, {}),
    evaluatorsBreakdown: evaluatorsByVerification.reduce((acc, curr) => {
      acc[curr.verification_status] = curr._count.id;
      return acc;
    }, {}),
    applicationsBreakdown: applicationsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {}),
    pilotsBreakdown: pilotsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {}),
    recentAuditLogs
  };
};

/**
 * Admin verifies or rejects a government department
 */
export const verifyDepartment = async (departmentId, data, adminUser, ip_address = null) => {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    include: { users: true }
  });

  if (!department) {
    throw new NotFoundError(`Department with ID ${departmentId} not found.`);
  }

  const { verification_status } = data;
  if (verification_status !== 'VERIFIED' && verification_status !== 'REJECTED' && verification_status !== 'PENDING') {
    throw new BadRequestError('Invalid verification status.');
  }

  const isVerified = verification_status === 'VERIFIED';

  const updatedDept = await prisma.$transaction(async (tx) => {
    const d = await tx.department.update({
      where: { id: departmentId },
      data: {
        verification_status
      }
    });

    // Update user verification status for department users
    await tx.user.updateMany({
      where: { department_id: departmentId, role: 'GOVERNMENT' },
      data: { is_verified: isVerified }
    });

    return d;
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: `DEPARTMENT_${verification_status}`,
    entity_type: 'DEPARTMENT',
    entity_id: departmentId,
    details: {
      department_name: department.name,
      previousStatus: department.verification_status,
      newStatus: verification_status
    },
    ip_address
  });

  // Notify department users
  for (const u of department.users) {
    await sendNotification({
      user_id: u.id,
      title: `Department Verification: ${verification_status}`,
      message: `Your department "${department.name}" official credentials have been marked as ${verification_status}.`,
      type: 'DEPARTMENT_VERIFIED',
      link: '/government/dashboard'
    });
  }

  return updatedDept;
};

/**
 * Admin updates a user's role securely
 */
export const updateUserRole = async (userId, data, adminUser, ip_address = null) => {
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    throw new NotFoundError(`User with ID ${userId} not found.`);
  }

  const { role, department_id } = data;
  if (!role || !['ADMIN', 'GOVERNMENT', 'EVALUATOR', 'STARTUP'].includes(role)) {
    throw new BadRequestError('Invalid role specified.');
  }

  const updateData = { role };

  // Part 16 & 20: Role transitions must not bypass verification
  if (role === 'EVALUATOR') {
    const evaluatorProfile = await prisma.evaluatorProfile.findUnique({
      where: { user_id: userId }
    });
    if (!evaluatorProfile || evaluatorProfile.verification_status !== 'VERIFIED') {
      throw new BadRequestError('Cannot change user role to EVALUATOR without an existing VERIFIED EvaluatorProfile.');
    }
  }

  if (role === 'GOVERNMENT') {
    const deptId = department_id !== undefined ? department_id : targetUser.department_id;
    if (!deptId) {
      throw new BadRequestError('Cannot change user role to GOVERNMENT without assigning a department.');
    }
    const dept = await prisma.department.findUnique({ where: { id: deptId } });
    if (!dept) {
      throw new BadRequestError(`Department with ID ${deptId} not found.`);
    }
    updateData.department_id = deptId;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department_id: true,
      is_active: true,
      is_verified: true,
      updated_at: true
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'USER_ROLE_CHANGED',
    entity_type: 'USER',
    entity_id: userId,
    details: { previousRole: targetUser.role, newRole: role, target_email: targetUser.email },
    ip_address
  });

  await sendNotification({
    user_id: userId,
    title: 'Account Role Updated',
    message: `Your official platform role has been updated to ${role} by administrator ${adminUser.name}.`,
    type: 'ROLE_CHANGED',
    link: '/login'
  });

  return updated;
};

/**
 * Admin securely provisions or invites a Government or Evaluator user
 * without exposing plaintext passwords to the administrator.
 */
export const provisionUser = async (data, adminUser, ip_address = null) => {
  const {
    name,
    email,
    role,
    department_id = null,
    designation = null,
    phone = null,
    organization = null,
    domain_expertise = null
  } = data;

  if (!email || !name || !role) {
    throw new BadRequestError('Name, email, and role are required.');
  }

  if (!['GOVERNMENT', 'EVALUATOR', 'STARTUP'].includes(role)) {
    throw new BadRequestError('Invalid role. Administrator can provision GOVERNMENT, EVALUATOR, or STARTUP users.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check email conflict
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new BadRequestError(`A user account with email '${normalizedEmail}' already exists.`);
  }

  if (role === 'GOVERNMENT' && department_id) {
    const dept = await prisma.department.findUnique({ where: { id: department_id } });
    if (!dept) {
      throw new BadRequestError(`Department with ID ${department_id} does not exist.`);
    }
  }

  // Generate secure random cryptographic invitation token
  const crypto = await import('crypto');
  const bcrypt = await import('bcrypt');
  const rawInvitationToken = crypto.default.randomBytes(32).toString('hex');
  const invitation_token_hash = crypto.default.createHash('sha256').update(rawInvitationToken).digest('hex');
  const invitation_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

  // Unusable random initial password hash until user sets their own password
  const randomInitialSecret = crypto.default.randomBytes(32).toString('hex');
  const password_hash = await bcrypt.default.hash(randomInitialSecret, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role,
      department_id: role === 'GOVERNMENT' ? department_id : null,
      designation: designation ? designation.trim() : null,
      phone: phone ? phone.trim() : null,
      invitation_token_hash,
      invitation_expires_at,
      is_active: true,
      is_verified: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department_id: true,
      designation: true,
      phone: true,
      is_active: true,
      is_verified: true,
      created_at: true,
      department: {
        select: {
          id: true,
          name: true,
          state: true
        }
      }
    }
  });

  // If Evaluator, create verified evaluator profile
  if (role === 'EVALUATOR') {
    const expertise = Array.isArray(domain_expertise)
      ? domain_expertise
      : (domain_expertise ? domain_expertise.split(',').map(s => s.trim()) : ['General Innovation']);

    await prisma.evaluatorProfile.create({
      data: {
        user_id: user.id,
        organization: organization ? organization.trim() : 'Innovation Evaluation Board',
        designation: designation ? designation.trim() : 'Evaluation Specialist',
        domain_expertise: expertise,
        verification_status: 'VERIFIED',
        verified_by: adminUser.id,
        verified_at: new Date()
      }
    }).catch(() => {});
  }

  await createAuditLog({
    user_id: adminUser.id,
    action: 'USER_PROVISIONED',
    entity_type: 'USER',
    entity_id: user.id,
    details: {
      provisioned_role: role,
      provisioned_email: normalizedEmail,
      department_id: user.department_id,
      invitation_expires_at: invitation_expires_at.toISOString()
    },
    ip_address
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'INVITATION_CREATED',
    entity_type: 'USER',
    entity_id: user.id,
    details: {
      recipient_email: normalizedEmail,
      role,
      expires_at: invitation_expires_at.toISOString()
    },
    ip_address
  });

  await sendNotification({
    user_id: user.id,
    title: 'Official Account Provisioned',
    message: `Your SetuGov official ${role} account has been provisioned and verified by ${adminUser.name}.`,
    type: 'ACCOUNT_PROVISIONED',
    link: '/login'
  });

  return {
    user,
    invitation: {
      invitation_token: rawInvitationToken,
      setup_link: `/set-password?token=${rawInvitationToken}`,
      setup_status: 'INVITATION_GENERATED',
      expiry: invitation_expires_at.toISOString()
    }
  };
};

export default {
  getDashboardOverview,
  verifyDepartment,
  updateUserRole,
  provisionUser
};

