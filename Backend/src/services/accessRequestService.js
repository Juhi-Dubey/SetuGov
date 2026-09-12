import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';

/**
 * Evaluator independently submits access request (Employed or Independent/Freelance)
 */
export const createEvaluatorSelfApplication = async (data, ip_address = null) => {
  const {
    name,
    email,
    phone,
    organization,
    designation,
    employment_type = 'INDEPENDENT',
    domain_expertise,
    years_experience = 0,
    bio,
    reason,
    supporting_document_url
  } = data;

  if (!name || !email || !reason) {
    throw new BadRequestError('Full name, professional email, and reason for joining are required.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if active user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser && existingUser.is_active && existingUser.is_verified) {
    throw new BadRequestError(`An active verified account with email '${normalizedEmail}' already exists.`);
  }

  const expertiseArray = Array.isArray(domain_expertise)
    ? domain_expertise
    : (domain_expertise ? domain_expertise.split(',').map(s => s.trim()).filter(Boolean) : ['General Innovation']);

  const orgName = (employment_type === 'INDEPENDENT' || !organization)
    ? (organization?.trim() || 'Independent Consultant')
    : organization.trim();

  const accessRequest = await prisma.accessRequest.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      requested_role: 'EVALUATOR',
      request_source: 'SELF_REQUEST',
      organization: orgName,
      designation: designation ? designation.trim() : 'Innovation Evaluator',
      employment_type,
      domain_expertise: expertiseArray,
      years_experience: Number(years_experience) || 0,
      bio: bio ? bio.trim() : null,
      reason: reason.trim(),
      supporting_document_url: supporting_document_url ? supporting_document_url.trim() : null,
      status: 'PENDING'
    }
  });

  await createAuditLog({
    user_id: null,
    action: 'ACCESS_REQUEST_SUBMITTED',
    entity_type: 'ACCESS_REQUEST',
    entity_id: accessRequest.id,
    details: {
      requested_role: 'EVALUATOR',
      request_source: 'SELF_REQUEST',
      email: normalizedEmail,
      employment_type
    },
    ip_address
  });

  // Notify all admins of incoming evaluator access request
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', is_active: true },
    select: { id: true }
  });

  for (const admin of admins) {
    await sendNotification({
      user_id: admin.id,
      title: 'New Evaluator Application',
      message: `${name.trim()} (${orgName}) has applied to join as an innovation evaluator.`,
      type: 'ACCESS_REQUEST_CREATED',
      link: '/admin/access-requests'
    });
  }

  return accessRequest;
};

/**
 * Government officer submits access request for official platform credentials
 */
export const createGovernmentAccessRequest = async (data, ip_address = null) => {
  const {
    name,
    email,
    phone,
    department_name,
    state,
    department_code,
    official_website,
    designation,
    reason,
    supporting_document_url
  } = data;

  if (!name || !email || !department_name || !state || !reason) {
    throw new BadRequestError('Full name, official email, department name, state, and reason are required.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if active user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser && existingUser.is_active && existingUser.is_verified) {
    throw new BadRequestError(`An active verified account with email '${normalizedEmail}' already exists.`);
  }

  // Find or create department (PENDING verification)
  let department = await prisma.department.findFirst({
    where: {
      name: { equals: department_name.trim(), mode: 'insensitive' },
      state: { equals: state.trim(), mode: 'insensitive' }
    }
  });

  if (!department) {
    department = await prisma.department.create({
      data: {
        name: department_name.trim(),
        state: state.trim(),
        contact_email: normalizedEmail,
        department_code: department_code ? department_code.trim() : null,
        nodal_officer_name: name.trim(),
        nodal_officer_designation: designation ? designation.trim() : null,
        nodal_officer_phone: phone ? phone.trim() : null,
        official_website: official_website ? official_website.trim() : null,
        verification_status: 'PENDING'
      }
    });
  }

  const accessRequest = await prisma.accessRequest.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      requested_role: 'GOVERNMENT',
      request_source: 'SELF_REQUEST',
      department_id: department.id,
      organization: department.name,
      designation: designation ? designation.trim() : 'Department Officer',
      domain_expertise: ['Public Procurement', 'Government Administration'],
      reason: reason.trim(),
      supporting_document_url: supporting_document_url ? supporting_document_url.trim() : null,
      status: 'PENDING'
    }
  });

  await createAuditLog({
    user_id: null,
    action: 'ACCESS_REQUEST_SUBMITTED',
    entity_type: 'ACCESS_REQUEST',
    entity_id: accessRequest.id,
    details: {
      requested_role: 'GOVERNMENT',
      request_source: 'SELF_REQUEST',
      email: normalizedEmail,
      department_id: department.id,
      department_name: department.name
    },
    ip_address
  });

  // Notify Admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', is_active: true },
    select: { id: true }
  });

  for (const admin of admins) {
    await sendNotification({
      user_id: admin.id,
      title: 'New Government Access Request',
      message: `Official access request received from ${name.trim()} (${department.name}, ${state.trim()}).`,
      type: 'ACCESS_REQUEST_CREATED',
      link: '/admin/access-requests'
    });
  }

  return accessRequest;
};

/**
 * Government officer nominates an evaluator (creates PENDING AccessRequest)
 * Government CANNOT directly verify or activate the evaluator!
 */
export const createGovernmentNomination = async (data, currentUser, ip_address = null) => {
  if (currentUser.role !== 'GOVERNMENT' && currentUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Government officers and Administrators can nominate evaluators.');
  }

  const {
    name,
    email,
    phone,
    organization,
    designation,
    employment_type = 'EMPLOYED',
    domain_expertise,
    years_experience = 0,
    bio,
    reason,
    supporting_document_url,
    challenge_id
  } = data;

  if (!name || !email || !reason) {
    throw new BadRequestError('Evaluator name, professional email, and reason for nomination are required.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const expertiseArray = Array.isArray(domain_expertise)
    ? domain_expertise
    : (domain_expertise ? domain_expertise.split(',').map(s => s.trim()).filter(Boolean) : ['General Innovation']);

  const orgName = (employment_type === 'INDEPENDENT' || !organization)
    ? (organization?.trim() || 'Independent Consultant')
    : organization.trim();

  // Create PENDING access request sourced from government nomination
  const accessRequest = await prisma.accessRequest.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      requested_role: 'EVALUATOR',
      request_source: 'GOVERNMENT_NOMINATION',
      department_id: currentUser.department_id || null,
      nominated_by_user_id: currentUser.id,
      challenge_id: challenge_id || null,
      organization: orgName,
      designation: designation ? designation.trim() : 'Evaluation Specialist',
      employment_type,
      domain_expertise: expertiseArray,
      years_experience: Number(years_experience) || 0,
      bio: bio ? bio.trim() : null,
      reason: reason.trim(),
      supporting_document_url: supporting_document_url ? supporting_document_url.trim() : null,
      status: 'PENDING'
    }
  });

  await createAuditLog({
    user_id: currentUser.id,
    action: 'EVALUATOR_NOMINATED',
    entity_type: 'ACCESS_REQUEST',
    entity_id: accessRequest.id,
    details: {
      nominated_email: normalizedEmail,
      nominator_name: currentUser.name,
      department_id: currentUser.department_id,
      status: 'PENDING'
    },
    ip_address
  });

  // Notify Admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', is_active: true },
    select: { id: true }
  });

  for (const admin of admins) {
    await sendNotification({
      user_id: admin.id,
      title: 'New Evaluator Nomination',
      message: `Government officer ${currentUser.name} nominated ${name.trim()} (${orgName}) as an evaluator.`,
      type: 'EVALUATOR_NOMINATED',
      link: '/admin/access-requests'
    });
  }

  // Notify Nominator
  await sendNotification({
    user_id: currentUser.id,
    title: 'Evaluator Nomination Submitted',
    message: `Your nomination for ${name.trim()} has been submitted for Administrative verification.`,
    type: 'NOMINATION_SUBMITTED',
    link: '/government/challenges'
  });

  return {
    ...accessRequest,
    message: 'Evaluator nomination successfully submitted for administrative verification. The evaluator will be available for assignment once approved by an administrator.'
  };
};

/**
 * List access requests with filtering (Admin only)
 */
export const getAccessRequests = async (query = {}, adminUser) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can view and manage access requests.');
  }

  const {
    status,
    requested_role,
    request_source,
    search,
    page = 1,
    limit = 20
  } = query;

  const where = {};
  if (status) where.status = status;
  if (requested_role) where.requested_role = requested_role;
  if (request_source) where.request_source = request_source;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { organization: { contains: search, mode: 'insensitive' } },
      { designation: { contains: search, mode: 'insensitive' } }
    ];
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  const [total, requests] = await Promise.all([
    prisma.accessRequest.count({ where }),
    prisma.accessRequest.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        department: {
          select: { id: true, name: true, state: true }
        },
        reviewer: {
          select: { id: true, name: true, email: true }
        },
        nominator: {
          select: { id: true, name: true, email: true, department_id: true }
        }
      }
    })
  ]);

  return {
    requests,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

/**
 * Get Access Request by ID (Admin only)
 */
export const getAccessRequestById = async (id, adminUser) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can view access request details.');
  }

  const request = await prisma.accessRequest.findUnique({
    where: { id },
    include: {
      department: true,
      reviewer: {
        select: { id: true, name: true, email: true }
      },
      nominator: {
        select: { id: true, name: true, email: true, department_id: true }
      }
    }
  });

  if (!request) {
    throw new NotFoundError(`Access request with ID ${id} not found.`);
  }

  return request;
};

/**
 * Mark request as UNDER_REVIEW (Admin only)
 */
export const reviewAccessRequest = async (id, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can review access requests.');
  }

  const request = await prisma.accessRequest.findUnique({ where: { id } });
  if (!request) {
    throw new NotFoundError(`Access request with ID ${id} not found.`);
  }

  const updated = await prisma.accessRequest.update({
    where: { id },
    data: {
      status: 'UNDER_REVIEW',
      reviewed_by: adminUser.id,
      reviewed_at: new Date()
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'ACCESS_REQUEST_REVIEWED',
    entity_type: 'ACCESS_REQUEST',
    entity_id: id,
    details: { applicant_email: request.email, requested_role: request.requested_role },
    ip_address
  });

  return updated;
};

/**
 * Approve Access Request & Securely Provision Account (Admin only)
 * Creates secure invitation token (SHA-256 hashed in DB, 72h expiry).
 * Plaintext password NEVER exposed.
 */
export const approveAccessRequest = async (id, data, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can approve access requests and verify privileged users.');
  }

  const request = await prisma.accessRequest.findUnique({
    where: { id },
    include: { department: true }
  });

  if (!request) {
    throw new NotFoundError(`Access request with ID ${id} not found.`);
  }

  if (request.status === 'APPROVED') {
    throw new BadRequestError('This access request has already been approved.');
  }

  const normalizedEmail = request.email.trim().toLowerCase();

  // Generate secure random cryptographic invitation token
  const rawInvitationToken = crypto.randomBytes(32).toString('hex');
  const invitation_token_hash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
  const invitation_expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  // Initial unusable random secret hash
  const initialSecret = crypto.randomBytes(32).toString('hex');
  const password_hash = await bcrypt.hash(initialSecret, 12);

  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user) {
    // If user exists (e.g. from previous setup), upgrade and verify them
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: request.requested_role,
        department_id: request.requested_role === 'GOVERNMENT' ? request.department_id : null,
        designation: request.designation || user.designation,
        phone: request.phone || user.phone,
        invitation_token_hash,
        invitation_expires_at,
        is_active: true,
        is_verified: true
      }
    });
  } else {
    // Create new verified user
    user = await prisma.user.create({
      data: {
        name: request.name,
        email: normalizedEmail,
        password_hash,
        role: request.requested_role,
        department_id: request.requested_role === 'GOVERNMENT' ? request.department_id : null,
        designation: request.designation,
        phone: request.phone,
        invitation_token_hash,
        invitation_expires_at,
        is_active: true,
        is_verified: true
      }
    });
  }

  // If Evaluator, create or verify EvaluatorProfile
  if (request.requested_role === 'EVALUATOR') {
    await prisma.evaluatorProfile.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        organization: request.organization || 'Independent Evaluator',
        designation: request.designation || 'Innovation Specialist',
        employment_type: request.employment_type || 'INDEPENDENT',
        domain_expertise: request.domain_expertise,
        years_experience: request.years_experience,
        bio: request.bio,
        verification_status: 'VERIFIED',
        verified_by: adminUser.id,
        verified_at: new Date()
      },
      update: {
        organization: request.organization || 'Independent Evaluator',
        designation: request.designation || 'Innovation Specialist',
        employment_type: request.employment_type || 'INDEPENDENT',
        domain_expertise: request.domain_expertise,
        years_experience: request.years_experience,
        bio: request.bio,
        verification_status: 'VERIFIED',
        verified_by: adminUser.id,
        verified_at: new Date()
      }
    });
  }

  // If Government and Department exists, verify Department if needed
  if (request.requested_role === 'GOVERNMENT' && request.department_id) {
    await prisma.department.update({
      where: { id: request.department_id },
      data: { verification_status: 'VERIFIED' }
    }).catch(() => {});
  }

  // Update AccessRequest status to APPROVED
  const updatedRequest = await prisma.accessRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewed_by: adminUser.id,
      reviewed_at: new Date()
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'ACCESS_REQUEST_APPROVED',
    entity_type: 'ACCESS_REQUEST',
    entity_id: id,
    details: {
      applicant_name: request.name,
      applicant_email: normalizedEmail,
      provisioned_role: request.requested_role,
      request_source: request.request_source,
      user_id: user.id
    },
    ip_address
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'USER_PROVISIONED',
    entity_type: 'USER',
    entity_id: user.id,
    details: {
      role: request.requested_role,
      email: normalizedEmail
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
      expires_at: invitation_expires_at.toISOString()
    },
    ip_address
  });

  // Notify applicant
  await sendNotification({
    user_id: user.id,
    title: 'Access Request Approved',
    message: `Your SetuGov ${request.requested_role} credentials have been verified and approved by Administrator ${adminUser.name}.`,
    type: 'ACCESS_REQUEST_APPROVED',
    link: `/set-password?token=${rawInvitationToken}`
  });

  // Notify nominator if this was a nomination
  if (request.nominated_by_user_id) {
    await sendNotification({
      user_id: request.nominated_by_user_id,
      title: 'Nominated Evaluator Verified',
      message: `Your nominated evaluator ${request.name} has been verified by Administrator ${adminUser.name} and is now available for challenge assignment.`,
      type: 'NOMINATION_APPROVED',
      link: '/government/challenges'
    });
  }

  return {
    request: updatedRequest,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified
    },
    invitation: {
      setup_token: rawInvitationToken,
      setup_link: `/set-password?token=${rawInvitationToken}`,
      expires_at: invitation_expires_at.toISOString()
    }
  };
};

/**
 * Reject Access Request (Admin only)
 */
export const rejectAccessRequest = async (id, data, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can reject access requests.');
  }

  const { rejection_reason } = data;
  if (!rejection_reason || !rejection_reason.trim()) {
    throw new BadRequestError('A specific rejection reason is required.');
  }

  const request = await prisma.accessRequest.findUnique({ where: { id } });
  if (!request) {
    throw new NotFoundError(`Access request with ID ${id} not found.`);
  }

  const updated = await prisma.accessRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejection_reason: rejection_reason.trim(),
      reviewed_by: adminUser.id,
      reviewed_at: new Date()
    }
  });

  await createAuditLog({
    user_id: adminUser.id,
    action: 'ACCESS_REQUEST_REJECTED',
    entity_type: 'ACCESS_REQUEST',
    entity_id: id,
    details: {
      applicant_email: request.email,
      requested_role: request.requested_role,
      rejection_reason: rejection_reason.trim()
    },
    ip_address
  });

  // Notify nominator if applicable
  if (request.nominated_by_user_id) {
    await sendNotification({
      user_id: request.nominated_by_user_id,
      title: 'Evaluator Nomination Not Approved',
      message: `Nomination for ${request.name} was not approved: ${rejection_reason.trim()}`,
      type: 'NOMINATION_REJECTED',
      link: '/government/challenges'
    });
  }

  return updated;
};

export default {
  createEvaluatorSelfApplication,
  createGovernmentAccessRequest,
  createGovernmentNomination,
  getAccessRequests,
  getAccessRequestById,
  reviewAccessRequest,
  approveAccessRequest,
  rejectAccessRequest
};
