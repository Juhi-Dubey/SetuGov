import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';
import { maskAccountNumber, getRequiredDocumentTypes } from './startupService.js';
import { sendInvitationEmail } from './emailService.js';
import { config } from '../config/env.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

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
  }, {
    maxWait: 10000,
    timeout: 15000
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
 * directly (bypassing the public AccessRequest onboarding submission queue),
 * without exposing plaintext passwords to the administrator.
 *
 * NOTE: For users submitting public access requests, the formal workflow is
 * handled via accessRequestService.approveAccessRequest(). This provisionUser
 * method is reserved for direct, unsolicited administrative invitations.
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
  const rawInvitationToken = crypto.randomBytes(32).toString('hex');
  const invitation_token_hash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
  const expiryHours = config.INVITATION_EXPIRY_HOURS || 48;
  const invitation_expires_at = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // Unusable random initial password hash until user sets their own password
  const randomInitialSecret = crypto.randomBytes(32).toString('hex');
  const password_hash = await bcrypt.hash(randomInitialSecret, 12);

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
      is_active: false,
      is_verified: false
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

  // If Evaluator, create pending evaluator profile without fabricated defaults
  if (role === 'EVALUATOR') {
    const expertise = Array.isArray(domain_expertise)
      ? domain_expertise
      : (domain_expertise ? domain_expertise.split(',').map(s => s.trim()) : []);

    await prisma.evaluatorProfile.create({
      data: {
        user_id: user.id,
        organization: organization ? organization.trim() : null,
        designation: designation ? designation.trim() : null,
        domain_expertise: expertise,
        verification_status: 'PENDING',
        verified_by: null,
        verified_at: null
      }
    }).catch(() => {});
  }

  // If Startup, create initial startup profile in DRAFT status without fabricated business defaults
  if (role === 'STARTUP') {
    await prisma.startup.create({
      data: {
        user_id: user.id,
        company_name: '',
        description: '',
        domain: '',
        technologies: [],
        readiness_level: 1,
        years_experience: 0,
        previous_deployments: 0,
        location: '',
        verification_status: 'DRAFT',
        verification_source: 'SELF_DECLARED'
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

  // Send real invitation email
  await sendInvitationEmail({
    email: normalizedEmail,
    name: user.name,
    role: user.role,
    rawToken: rawInvitationToken,
    departmentName: user.department ? user.department.name : null
  });

  return {
    user,
    invitation: {
      expires_at: invitation_expires_at.toISOString(),
      email_accepted_by_provider: true
    }
  };
};

/**
 * ----------------------------------------------------
 * SYSTEM SETTINGS (Phase 5: PostgreSQL Persistence)
 * ----------------------------------------------------
 */
const DEFAULT_SETTINGS = {
  platformName: "SetuGov Procurement OS",
  supportEmail: "support@setugov.gov.in",
  timezone: "IST (UTC+05:30)",
  currency: "INR (₹)",
  mfaRequired: true,
  sessionTimeout: "30",
  auditRetentionDays: "365",
  emailNotifications: true,
  challengeSubmissionAlerts: true,
  evaluationReminders: true,
  autoBackupEnabled: true
};

export const getSystemSettings = async () => {
  const settingsRecords = await prisma.systemSetting.findMany();
  if (settingsRecords.length === 0) {
    // Seed default settings into PostgreSQL
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }
    return DEFAULT_SETTINGS;
  }

  const result = { ...DEFAULT_SETTINGS };
  for (const record of settingsRecords) {
    result[record.key] = record.value;
  }
  return result;
};

export const updateSystemSettings = async (settingsData, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can update system configurations.');
  }

  for (const [key, value] of Object.entries(settingsData)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value, updated_by: adminUser.id },
      create: { key, value, updated_by: adminUser.id }
    });
  }

  await createAuditLog({
    user_id: adminUser.id,
    action: 'SYSTEM_SETTINGS_UPDATED',
    entity_type: 'SYSTEM',
    entity_id: 'SYSTEM_CONFIG',
    details: { updated_keys: Object.keys(settingsData) },
    ip_address
  });

  return getSystemSettings();
};

/**
 * ----------------------------------------------------
 * EVALUATION CRITERIA (Phase 5: PostgreSQL Persistence)
 * ----------------------------------------------------
 */
const DEFAULT_CRITERIA = [
  {
    name: "Innovation",
    description: "Measures the originality and innovative nature of the proposed solution.",
    weight: 25.0,
    status: "Active"
  },
  {
    name: "Technical Feasibility",
    description: "Evaluates whether the proposed technology can realistically be implemented.",
    weight: 20.0,
    status: "Active"
  },
  {
    name: "Scalability",
    description: "Measures the ability of the solution to scale across departments and locations.",
    weight: 15.0,
    status: "Active"
  },
  {
    name: "Cost Effectiveness",
    description: "Evaluates the value delivered compared with implementation and operational costs.",
    weight: 15.0,
    status: "Active"
  },
  {
    name: "Social Impact",
    description: "Measures the expected social and public-service impact of the solution.",
    weight: 15.0,
    status: "Active"
  },
  {
    name: "Compliance & Security",
    description: "Measures adherence to government data boundary and cybersecurity standards.",
    weight: 10.0,
    status: "Active"
  }
];

export const getEvaluationCriteria = async () => {
  const criteria = await prisma.evaluationCriterion.findMany({
    orderBy: { created_at: 'asc' }
  });

  if (criteria.length === 0) {
    for (const item of DEFAULT_CRITERIA) {
      await prisma.evaluationCriterion.create({ data: item });
    }
    return prisma.evaluationCriterion.findMany({ orderBy: { created_at: 'asc' } });
  }

  return criteria;
};

export const createEvaluationCriterion = async (data, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can create evaluation criteria.');
  }

  const { name, description, weight, status = 'Active' } = data;
  if (!name || weight === undefined) {
    throw new BadRequestError('Criterion name and weight percentage are required.');
  }

  const criterion = await prisma.evaluationCriterion.create({
    data: {
      name: name.trim(),
      description: description ? description.trim() : '',
      weight: parseFloat(weight),
      status: status || 'Active'
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'EVALUATION_CRITERION_CREATED',
    entity_type: 'CRITERION',
    entity_id: criterion.id,
    details: { name: criterion.name, weight: criterion.weight },
    ip_address
  });

  return criterion;
};

export const updateEvaluationCriterion = async (id, data, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can update evaluation criteria.');
  }

  const existing = await prisma.evaluationCriterion.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Criterion with ID ${id} not found.`);
  }

  const updated = await prisma.evaluationCriterion.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      weight: data.weight !== undefined ? parseFloat(data.weight) : existing.weight,
      status: data.status !== undefined ? data.status : existing.status
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'EVALUATION_CRITERION_UPDATED',
    entity_type: 'CRITERION',
    entity_id: id,
    details: { updated_fields: data },
    ip_address
  });

  return updated;
};

export const deleteEvaluationCriterion = async (id, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can delete evaluation criteria.');
  }

  const existing = await prisma.evaluationCriterion.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Criterion with ID ${id} not found.`);
  }

  await prisma.evaluationCriterion.delete({ where: { id } });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'EVALUATION_CRITERION_DELETED',
    entity_type: 'CRITERION',
    entity_id: id,
    details: { deleted_name: existing.name },
    ip_address
  });

  return { success: true, message: `Criterion "${existing.name}" deleted successfully.` };
};

/**
 * ----------------------------------------------------
 * SYSTEM TEMPLATES (Phase 5: PostgreSQL Persistence)
 * ----------------------------------------------------
 */
const DEFAULT_TEMPLATES = [
  {
    name: "Government Challenge Template",
    type: "Challenge",
    description: "Standard template for creating outcome-based government challenges.",
    fields_count: 12,
    status: "Active"
  },
  {
    name: "Startup Evaluation Template",
    type: "Evaluation",
    description: "Standard evaluation form containing innovation, feasibility, scalability and impact criteria.",
    fields_count: 8,
    status: "Active"
  },
  {
    name: "Pilot Proposal Template",
    type: "Pilot",
    description: "Template for defining pilot objectives, milestones, resources and success metrics.",
    fields_count: 10,
    status: "Active"
  },
  {
    name: "Pilot Completion Report",
    type: "Pilot",
    description: "Template for documenting pilot outcomes, evidence and performance.",
    fields_count: 9,
    status: "Active"
  },
  {
    name: "Procurement Decision Template",
    type: "Decision",
    description: "Template for recording the final decision after evaluation and pilot completion.",
    fields_count: 7,
    status: "Active"
  }
];

export const getSystemTemplates = async (query = {}) => {
  const where = {};
  if (query.type && query.type !== 'All') where.type = query.type;
  if (query.status && query.status !== 'All') where.status = query.status;

  const templates = await prisma.systemTemplate.findMany({
    where,
    orderBy: { created_at: 'asc' }
  });

  if (templates.length === 0 && Object.keys(where).length === 0) {
    for (const item of DEFAULT_TEMPLATES) {
      await prisma.systemTemplate.create({ data: item });
    }
    return prisma.systemTemplate.findMany({ orderBy: { created_at: 'asc' } });
  }

  return templates;
};

export const createSystemTemplate = async (data, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can create system templates.');
  }

  const { name, type, description, fields_count = 0, status = 'Active', schema_definition } = data;
  if (!name || !type) {
    throw new BadRequestError('Template name and type are required.');
  }

  const template = await prisma.systemTemplate.create({
    data: {
      name: name.trim(),
      type: type.trim(),
      description: description ? description.trim() : '',
      fields_count: parseInt(fields_count, 10) || 0,
      status: status || 'Active',
      schema_definition: schema_definition || null
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'SYSTEM_TEMPLATE_CREATED',
    entity_type: 'TEMPLATE',
    entity_id: template.id,
    details: { name: template.name, type: template.type },
    ip_address
  });

  return template;
};

export const updateSystemTemplate = async (id, data, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can update system templates.');
  }

  const existing = await prisma.systemTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Template with ID ${id} not found.`);
  }

  const updated = await prisma.systemTemplate.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      type: data.type !== undefined ? data.type.trim() : existing.type,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      fields_count: data.fields_count !== undefined ? parseInt(data.fields_count, 10) : existing.fields_count,
      status: data.status !== undefined ? data.status : existing.status,
      schema_definition: data.schema_definition !== undefined ? data.schema_definition : existing.schema_definition
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'SYSTEM_TEMPLATE_UPDATED',
    entity_type: 'TEMPLATE',
    entity_id: id,
    details: { updated_fields: data },
    ip_address
  });

  return updated;
};

export const deleteSystemTemplate = async (id, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can delete system templates.');
  }

  const existing = await prisma.systemTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Template with ID ${id} not found.`);
  }

  await prisma.systemTemplate.delete({ where: { id } });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'SYSTEM_TEMPLATE_DELETED',
    entity_type: 'TEMPLATE',
    entity_id: id,
    details: { deleted_name: existing.name },
    ip_address
  });

  return { success: true, message: `Template "${existing.name}" deleted successfully.` };
};

export const getStartupVerifications = async (query = {}) => {
  const { status, org_type, search, page = 1, limit = 20 } = query;

  const where = {};
  if (status && status !== 'All') {
    where.verification_status = status;
  }
  if (org_type && org_type !== 'All') {
    where.org_type = org_type;
  }
  if (search) {
    where.OR = [
      { company_name: { contains: search, mode: 'insensitive' } },
      { pan_number: { contains: search, mode: 'insensitive' } },
      { dpiit_number: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [total, startups] = await Promise.all([
    prisma.startup.count({ where }),
    prisma.startup.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            is_active: true,
            is_verified: true
          }
        },
        documents: true,
        bank_details: true,
        _count: {
          select: {
            applications: true,
            pilots: true
          }
        }
      }
    })
  ]);

  return {
    startups,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

export const getStartupVerificationById = async (id) => {
  const startup = await prisma.startup.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_active: true,
          is_verified: true,
          created_at: true
        }
      },
      documents: {
        include: {
          verifier: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { created_at: 'desc' }
      },
      bank_details: true,
      verifier: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: {
          applications: true,
          pilots: true
        }
      }
    }
  });

  if (!startup) {
    throw new NotFoundError(`Startup with ID ${id} not found.`);
  }

  if (startup.bank_details) {
    startup.bank_details.masked_account_number = maskAccountNumber(startup.bank_details.account_number);
  }

  return startup;
};

export const reviewStartupVerification = async (id, { action, notes, rejection_reason, correction_notes }, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can verify startup organizations.');
  }

  const startup = await prisma.startup.findUnique({
    where: { id },
    include: { user: true, documents: true, bank_details: true }
  });

  if (!startup) {
    throw new NotFoundError(`Startup with ID ${id} not found.`);
  }

  // State machine transition validation
  if (action === 'START_REVIEW' && startup.verification_status !== 'SUBMITTED') {
    throw new BadRequestError(`Cannot start review from status ${startup.verification_status}. Startup dossier must be SUBMITTED first.`);
  }
  if (action === 'APPROVE') {
    if (!['UNDER_REVIEW', 'SUBMITTED'].includes(startup.verification_status)) {
      throw new BadRequestError(`Cannot approve startup from status ${startup.verification_status}. Startup must be SUBMITTED or UNDER_REVIEW.`);
    }

    // Account & Email Verification Guard: User email must be verified
    if (!startup.user.is_verified) {
      throw new BadRequestError('Cannot verify startup: startup account email address has not been verified yet.');
    }

    // Submission & Declaration Guard: Registration must have been formally submitted
    if (!startup.submitted_at) {
      throw new BadRequestError('Cannot verify startup: registration submission and truthfulness declaration must be completed first.');
    }

    // Completeness Guard: Organization identity, complete registered address, and bank details
    if (!startup.company_name || startup.company_name.length < 2 || !startup.registered_address || !startup.pan_number) {
      throw new BadRequestError('Cannot verify startup: organization identity is incomplete.');
    }
    if (!startup.city || !startup.state || !startup.pincode) {
      throw new BadRequestError('Cannot verify startup: complete registered organization city, state, and pincode are required.');
    }
    if (!startup.authorized_person_name || !startup.authorized_person_email) {
      throw new BadRequestError('Cannot verify startup: authorized signatory information is incomplete.');
    }
    if (!startup.bank_details || !startup.bank_details.account_number || !startup.bank_details.ifsc_code) {
      throw new BadRequestError('Cannot verify startup: company bank account details are missing.');
    }

    // Mandatory Document Verification Guard:
    // All entity-specific required documents must exist and have verification_status === 'VERIFIED'
    const requiredDocTypes = getRequiredDocumentTypes(startup.org_type);
    const verifiedDocTypes = new Set(
      (startup.documents || [])
        .filter(d => d.verification_status === 'VERIFIED')
        .map(d => d.document_type.toUpperCase())
    );

    const missingOrUnverifiedDocs = requiredDocTypes.filter(t => !verifiedDocTypes.has(t.toUpperCase()));
    if (missingOrUnverifiedDocs.length > 0) {
      throw new BadRequestError(
        `Cannot verify startup: all required documents for ${startup.org_type} must be individually verified by an administrator before final approval. Missing or unverified documents: ${missingOrUnverifiedDocs.join(', ')}`
      );
    }

    // Ensure no uploaded document is currently in REJECTED status
    const hasRejectedDocs = (startup.documents || []).some(d => d.verification_status === 'REJECTED');
    if (hasRejectedDocs) {
      throw new BadRequestError('Cannot verify startup while one or more submitted documents remain REJECTED. Request correction or re-verify documents first.');
    }
  }

  if (action === 'REJECT' && !['UNDER_REVIEW', 'SUBMITTED'].includes(startup.verification_status)) {
    throw new BadRequestError(`Cannot reject startup from status ${startup.verification_status}.`);
  }
  if (action === 'REQUEST_CORRECTION' && !['UNDER_REVIEW', 'SUBMITTED'].includes(startup.verification_status)) {
    throw new BadRequestError(`Cannot request corrections from status ${startup.verification_status}.`);
  }

  let newStatus = startup.verification_status;
  const updateData = {
    reviewed_by: adminUser.id,
    reviewed_at: new Date()
  };

  if (action === 'START_REVIEW') {
    newStatus = 'UNDER_REVIEW';
    updateData.verification_status = 'UNDER_REVIEW';
    updateData.verification_notes = notes || startup.verification_notes;
    updateData.verified_by = null;
    updateData.verified_at = null;
  } else if (action === 'APPROVE') {
    newStatus = 'VERIFIED';
    updateData.verification_status = 'VERIFIED';
    updateData.verified_by = adminUser.id;
    updateData.verified_at = new Date();
    updateData.verification_notes = notes || 'All organization credentials and documents administratively verified.';
    updateData.rejection_reason = null;
    updateData.correction_notes = null;
  } else if (action === 'REJECT') {
    newStatus = 'REJECTED';
    updateData.verification_status = 'REJECTED';
    updateData.verified_by = null;
    updateData.verified_at = null;
    updateData.rejection_reason = rejection_reason || notes || 'Organization verification rejected.';
    updateData.verification_notes = notes || null;
  } else if (action === 'REQUEST_CORRECTION') {
    newStatus = 'CORRECTION_REQUESTED';
    updateData.verification_status = 'CORRECTION_REQUESTED';
    updateData.verified_by = null;
    updateData.verified_at = null;
    updateData.correction_notes = correction_notes || notes || 'Please revise submitted organization details and re-upload required documents.';
  }

  const updatedStartup = await prisma.startup.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: { id: true, name: true, email: true }
      },
      documents: true,
      bank_details: true
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: `STARTUP_VERIFICATION_${action}`,
    entity_type: 'STARTUP',
    entity_id: id,
    details: {
      company_name: startup.company_name,
      previous_status: startup.verification_status,
      new_status: newStatus,
      action,
      notes
    },
    ip_address
  });

  // Dispath notification to startup user
  await sendNotification({
    user_id: startup.user_id,
    title: `Startup Verification: ${newStatus.replace('_', ' ')}`,
    message: action === 'APPROVE'
      ? `Congratulations! ${startup.company_name} is now officially VERIFIED. You can now apply for government challenges.`
      : action === 'REQUEST_CORRECTION'
      ? `Correction requested for ${startup.company_name}: ${updateData.correction_notes}`
      : `Your verification status has been updated to ${newStatus}.`,
    type: 'VERIFICATION',
    link: `/startup/profile`
  });

  return updatedStartup;
};

export const verifyStartupDocument = async (documentId, { verification_status, rejection_reason }, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can verify startup documents.');
  }

  const document = await prisma.startupDocument.findUnique({
    where: { id: documentId },
    include: { startup: true }
  });

  if (!document) {
    throw new NotFoundError(`Document with ID ${documentId} not found.`);
  }

  const updated = await prisma.startupDocument.update({
    where: { id: documentId },
    data: {
      verification_status,
      verified_by: adminUser.id,
      verified_at: new Date(),
      rejection_reason: verification_status === 'REJECTED' ? (rejection_reason || 'Document does not meet authenticity criteria.') : null
    },
    include: {
      verifier: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // If a required document is rejected, update startup status to CORRECTION_REQUESTED if currently under review or submitted
  if (verification_status === 'REJECTED' && ['SUBMITTED', 'UNDER_REVIEW'].includes(document.startup.verification_status)) {
    await prisma.startup.update({
      where: { id: document.startup_id },
      data: {
        verification_status: 'CORRECTION_REQUESTED',
        correction_notes: `Document '${document.document_type}' was rejected: ${rejection_reason || 'Please upload a valid, authentic copy and resubmit.'}`
      }
    });

    await sendNotification({
      user_id: document.startup.user_id,
      title: 'Document Correction Requested',
      message: `Your document (${document.document_type}) was rejected during verification. Reason: ${rejection_reason || 'Please re-upload'}.`,
      type: 'VERIFICATION',
      link: '/startup/profile'
    });
  }

  await createAuditLog({
    user_id: adminUser.id,
    action: `STARTUP_DOCUMENT_${verification_status}`,
    entity_type: 'STARTUP_DOCUMENT',
    entity_id: documentId,
    details: {
      startup_id: document.startup_id,
      document_type: document.document_type,
      status: verification_status,
      rejection_reason
    },
    ip_address
  });

  return updated;
};

export const unlockUserAccount = async (userId, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can unlock user accounts.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError(`User with ID ${userId} not found.`);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      failed_login_attempts: 0,
      locked_until: null
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      failed_login_attempts: true,
      locked_until: true
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'ADMIN_ACCOUNT_UNLOCKED',
    entity_type: 'USER',
    entity_id: userId,
    details: { unlocked_email: user.email, admin_id: adminUser.id },
    ip_address
  });

  return updatedUser;
};

export default {
  getDashboardOverview,
  verifyDepartment,
  updateUserRole,
  provisionUser,
  getSystemSettings,
  updateSystemSettings,
  getEvaluationCriteria,
  createEvaluationCriterion,
  updateEvaluationCriterion,
  deleteEvaluationCriterion,
  getSystemTemplates,
  createSystemTemplate,
  updateSystemTemplate,
  deleteSystemTemplate,
  getStartupVerifications,
  getStartupVerificationById,
  reviewStartupVerification,
  verifyStartupDocument,
  unlockUserAccount
};



