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

  // Check if active verified user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser && existingUser.is_active && existingUser.is_verified) {
    throw new BadRequestError(`An active verified account with email '${normalizedEmail}' already exists.`);
  }

  // Duplicate Active Request Protection
  const existingActiveRequest = await prisma.accessRequest.findFirst({
    where: {
      email: normalizedEmail,
      status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }
    }
  });
  if (existingActiveRequest) {
    if (existingActiveRequest.status === 'PENDING' || existingActiveRequest.status === 'UNDER_REVIEW') {
      throw new BadRequestError('An access request for this email is currently pending review.');
    }
    if (existingActiveRequest.status === 'APPROVED') {
      throw new BadRequestError('An approved access request already exists for this email. Please check your invitation or contact support.');
    }
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
      requested_role: 'EVALUATOR', // Enforce EVALUATOR
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

  // Notify all admins
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
 * Public portal: requested_role is strictly enforced as GOVERNMENT on backend.
 */
export const createGovernmentAccessRequest = async (data, ip_address = null) => {
  const {
    name,
    email,
    phone,
    department_name,
    state,
    department_id,
    department_code,
    official_website,
    designation,
    reason,
    supporting_document_url,
    employment_type,
    organization
  } = data;

  if (!name || !email || !department_name || !state || !reason) {
    throw new BadRequestError('Full name, official email, department name, state, and reason are required.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if active verified user already exists or belongs to another role
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    if (existingUser.role !== 'GOVERNMENT') {
      throw new ForbiddenError(
        `Cannot submit Government access request: an account with email '${normalizedEmail}' already exists with role '${existingUser.role}'. Cross-role privilege escalation is prohibited.`
      );
    }
    if (existingUser.is_active && existingUser.is_verified) {
      throw new BadRequestError(`An active verified Government account with email '${normalizedEmail}' already exists.`);
    }
  }

  // Duplicate Active Request Protection
  const existingActiveRequest = await prisma.accessRequest.findFirst({
    where: {
      email: normalizedEmail,
      status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }
    }
  });
  if (existingActiveRequest) {
    if (existingActiveRequest.status === 'PENDING' || existingActiveRequest.status === 'UNDER_REVIEW') {
      throw new BadRequestError('An access request for this email is currently pending review.');
    }
    if (existingActiveRequest.status === 'APPROVED') {
      throw new BadRequestError('An approved access request already exists for this email. Please check your invitation or contact support.');
    }
  }

  // Department Security: Match existing department if possible, otherwise keep department_id null for Admin review
  let matchedDepartmentId = null;
  if (department_id) {
    const dep = await prisma.department.findUnique({ where: { id: department_id } });
    if (dep) matchedDepartmentId = dep.id;
  }

  if (!matchedDepartmentId) {
    const existingDept = await prisma.department.findFirst({
      where: {
        name: { equals: department_name.trim(), mode: 'insensitive' },
        state: { equals: state.trim(), mode: 'insensitive' }
      }
    });
    if (existingDept) {
      matchedDepartmentId = existingDept.id;
    }
  }

  const accessRequest = await prisma.accessRequest.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      requested_role: 'GOVERNMENT', // Backend is strictly authoritative: always GOVERNMENT
      request_source: 'SELF_REQUEST',
      department_id: matchedDepartmentId,
      department_name: department_name.trim(),
      state: state.trim(),
      department_code: department_code ? department_code.trim() : null,
      official_website: official_website ? official_website.trim() : null,
      organization: organization ? organization.trim() : department_name.trim(),
      designation: designation ? designation.trim() : 'Department Nodal Officer',
      employment_type: employment_type || 'EMPLOYED',
      domain_expertise: ['Public Procurement', 'Government Administration'],
      reason: reason.trim(),
      supporting_document_url: supporting_document_url ? supporting_document_url.trim() : null,
      status: 'PENDING'
    }
  });

  await createAuditLog({
    user_id: null,
    action: 'GOVERNMENT_ACCESS_REQUEST_SUBMITTED',
    entity_type: 'ACCESS_REQUEST',
    entity_id: accessRequest.id,
    details: {
      requested_role: 'GOVERNMENT',
      request_source: 'SELF_REQUEST',
      email: normalizedEmail,
      department_id: matchedDepartmentId,
      department_name: department_name.trim(),
      state: state.trim()
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
      message: `Official access request received from ${name.trim()} (${department_name.trim()}, ${state.trim()}).`,
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

  // Check if active verified user already exists or belongs to another role
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    if (existingUser.role !== 'EVALUATOR') {
      throw new ForbiddenError(
        `Cannot nominate evaluator: an account with email '${normalizedEmail}' already exists with role '${existingUser.role}'. Cross-role conversion is prohibited.`
      );
    }
    if (existingUser.is_active && existingUser.is_verified) {
      throw new BadRequestError(`An active verified Evaluator account with email '${normalizedEmail}' already exists.`);
    }
  }

  // Duplicate Active Request Protection
  const existingActiveRequest = await prisma.accessRequest.findFirst({
    where: {
      email: normalizedEmail,
      status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }
    }
  });
  if (existingActiveRequest) {
    if (existingActiveRequest.status === 'PENDING' || existingActiveRequest.status === 'UNDER_REVIEW') {
      throw new BadRequestError('An access request for this email is currently pending review.');
    }
    if (existingActiveRequest.status === 'APPROVED') {
      throw new BadRequestError('An approved access request already exists for this email. Please check your invitation or contact support.');
    }
  }

  const expertiseArray = Array.isArray(domain_expertise)
    ? domain_expertise
    : (domain_expertise ? domain_expertise.split(',').map(s => s.trim()).filter(Boolean) : ['General Innovation']);

  const orgName = (employment_type === 'INDEPENDENT' || !organization)
    ? (organization?.trim() || 'Independent Consultant')
    : organization.trim();

  // Challenge Authorization Scoping: If challenge_id is provided, verify authorization
  let validatedChallengeId = null;
  if (challenge_id) {
    const challenge = await prisma.challenge.findUnique({ where: { id: challenge_id } });
    if (!challenge) {
      throw new BadRequestError(`Challenge with ID '${challenge_id}' not found.`);
    }
    if (currentUser.role === 'GOVERNMENT') {
      const isCreator = challenge.created_by === currentUser.id;
      const isDeptMatch = currentUser.department_id && challenge.department_id === currentUser.department_id;
      if (!isCreator && !isDeptMatch) {
        throw new ForbiddenError('You are not authorized to nominate evaluators for a challenge belonging to another department.');
      }
    }
    validatedChallengeId = challenge.id;
  }

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
      challenge_id: validatedChallengeId,
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
  if (status && status !== 'ALL') where.status = status;
  if (requested_role && requested_role !== 'ALL') where.requested_role = requested_role;
  if (request_source && request_source !== 'ALL') where.request_source = request_source;
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

  const auditAction = request.requested_role === 'GOVERNMENT'
    ? 'GOVERNMENT_ACCESS_REQUEST_REVIEWED'
    : 'EVALUATOR_ACCESS_REQUEST_REVIEWED';

  await createAuditLog({
    user_id: adminUser.id,
    action: auditAction,
    entity_type: 'ACCESS_REQUEST',
    entity_id: id,
    details: { applicant_email: request.email, requested_role: request.requested_role },
    ip_address
  });

  return updated;
};

/**
 * Approve Access Request & Generate Secure Invitation Token (Admin only)
 * Security rule: Does NOT activate the account immediately.
 * Account becomes ACTIVE only when the officer/evaluator accepts the invitation and creates password.
 */
export const approveAccessRequest = async (id, data = {}, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can approve access requests.');
  }

  return await prisma.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({
      where: { id },
      include: { department: true }
    });

    if (!request) {
      throw new NotFoundError(`Access request with ID ${id} not found.`);
    }

    if (request.status === 'APPROVED') {
      throw new BadRequestError('This access request has already been approved.');
    }

    if (request.status === 'REJECTED') {
      throw new BadRequestError('Cannot approve a request that has already been rejected.');
    }

    if (request.status !== 'PENDING' && request.status !== 'UNDER_REVIEW') {
      throw new BadRequestError('Access request is not in a pending review state.');
    }

    const normalizedEmail = request.email.trim().toLowerCase();

    // Privilege Escalation / Existing User Check
    const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      if (existingUser.role !== request.requested_role) {
        throw new ForbiddenError(
          `Cannot approve access request: an account with email '${normalizedEmail}' already exists with role '${existingUser.role}'. Cross-role privilege escalation is strictly prohibited.`
        );
      }
      if (existingUser.is_active && existingUser.is_verified && existingUser.invitation_accepted_at) {
        throw new BadRequestError(`An active, verified ${request.requested_role} account already exists for ${normalizedEmail}.`);
      }
    }

    // Handle department association for Government requests
    let targetDepartmentId = data.department_id || request.department_id;
    if (!targetDepartmentId && request.requested_role === 'GOVERNMENT') {
      const deptName = request.department_name || request.organization || 'Government Department';
      const deptState = request.state || 'National / Central';
      let dept = await tx.department.findFirst({
        where: {
          name: { equals: deptName, mode: 'insensitive' },
          state: { equals: deptState, mode: 'insensitive' }
        }
      });
      if (!dept) {
        dept = await tx.department.create({
          data: {
            name: deptName,
            state: deptState,
            department_code: request.department_code || null,
            official_website: request.official_website || null,
            contact_email: normalizedEmail,
            verification_status: 'PENDING'
          }
        });
      }
      targetDepartmentId = dept.id;
    }

    // Generate cryptographically secure random invitation token
    const rawInvitationToken = crypto.randomBytes(32).toString('hex');
    const invitation_token_hash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
    const invitation_expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Create or update User in UNACTIVATED state (is_active: false, is_verified: false)
    const unguessablePlaceholder = crypto.randomBytes(32).toString('hex');
    const tempPasswordHash = await bcrypt.hash(unguessablePlaceholder, 12);

    let user;
    if (existingUser) {
      user = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          department_id: request.requested_role === 'GOVERNMENT' ? targetDepartmentId : null,
          designation: request.designation || existingUser.designation,
          phone: request.phone || existingUser.phone,
          invitation_token_hash,
          invitation_expires_at,
          invitation_accepted_at: null,
          is_active: false, // NOT ACTIVE YET
          is_verified: false
        }
      });
    } else {
      user = await tx.user.create({
        data: {
          name: request.name,
          email: normalizedEmail,
          password_hash: tempPasswordHash,
          role: request.requested_role,
          department_id: request.requested_role === 'GOVERNMENT' ? targetDepartmentId : null,
          designation: request.designation,
          phone: request.phone,
          invitation_token_hash,
          invitation_expires_at,
          invitation_accepted_at: null,
          is_active: false, // NOT ACTIVE YET
          is_verified: false
        }
      });
    }

    // If Evaluator, prepare unverified EvaluatorProfile
    if (request.requested_role === 'EVALUATOR') {
      await tx.evaluatorProfile.upsert({
        where: { user_id: user.id },
        create: {
          user_id: user.id,
          organization: request.organization || 'Independent Evaluator',
          designation: request.designation || 'Innovation Specialist',
          employment_type: request.employment_type || 'INDEPENDENT',
          domain_expertise: request.domain_expertise,
          years_experience: request.years_experience,
          bio: request.bio,
          verification_status: 'PENDING',
          verified_by: adminUser.id,
          verified_at: null
        },
        update: {
          organization: request.organization || 'Independent Evaluator',
          designation: request.designation || 'Innovation Specialist',
          employment_type: request.employment_type || 'INDEPENDENT',
          domain_expertise: request.domain_expertise,
          years_experience: request.years_experience,
          bio: request.bio,
          verification_status: 'PENDING',
          verified_by: adminUser.id,
          verified_at: null
        }
      });
    }

    // Update AccessRequest status to APPROVED
    const updatedRequest = await tx.accessRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        department_id: targetDepartmentId,
        reviewed_by: adminUser.id,
        reviewed_at: new Date()
      }
    });

    const isGov = request.requested_role === 'GOVERNMENT';

    await createAuditLog({
      user_id: adminUser.id,
      action: isGov ? 'GOVERNMENT_ACCESS_REQUEST_APPROVED' : 'EVALUATOR_ACCESS_REQUEST_APPROVED',
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
      action: isGov ? 'GOVERNMENT_INVITATION_CREATED' : 'EVALUATOR_INVITATION_CREATED',
      entity_type: 'USER',
      entity_id: user.id,
      details: {
        recipient_email: normalizedEmail,
        expires_at: invitation_expires_at.toISOString(),
        role: request.requested_role
      },
      ip_address
    });

    return {
      request: updatedRequest,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        is_verified: user.is_verified
      },
      invitation: {
        setup_token: rawInvitationToken,
        setup_link: `/invite/accept?token=${rawInvitationToken}`,
        government_setup_link: `/government/set-password?token=${rawInvitationToken}`,
        expires_at: invitation_expires_at.toISOString()
      }
    };
  });
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

  return await prisma.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundError(`Access request with ID ${id} not found.`);
    }

    if (request.status === 'REJECTED') {
      throw new BadRequestError('This access request has already been rejected.');
    }

    if (request.status === 'APPROVED') {
      throw new BadRequestError('Cannot reject an access request that has already been approved.');
    }

    const updated = await tx.accessRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejection_reason: rejection_reason.trim(),
        reviewed_by: adminUser.id,
        reviewed_at: new Date()
      }
    });

    const isGov = request.requested_role === 'GOVERNMENT';

    await createAuditLog({
      user_id: adminUser.id,
      action: isGov ? 'GOVERNMENT_ACCESS_REQUEST_REJECTED' : 'EVALUATOR_ACCESS_REQUEST_REJECTED',
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
  });
};

/**
 * Resend / Re-generate Invitation Token (Admin only)
 * Invalidates old invitation token and generates a new 72h token.
 */
export const resendInvitation = async (id, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can resend access invitations.');
  }

  return await prisma.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundError(`Access request with ID ${id} not found.`);
    }

    if (request.status !== 'APPROVED') {
      throw new BadRequestError('Cannot resend invitation for a request that has not been approved.');
    }

    const normalizedEmail = request.email.trim().toLowerCase();
    const user = await tx.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new NotFoundError(`User account associated with this request not found.`);
    }

    if (user.is_active && user.is_verified && user.invitation_accepted_at) {
      throw new BadRequestError('User has already accepted the invitation and activated their account.');
    }

    // Generate new secure random token and invalidate old hash
    const rawInvitationToken = crypto.randomBytes(32).toString('hex');
    const invitation_token_hash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
    const invitation_expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await tx.user.update({
      where: { id: user.id },
      data: {
        invitation_token_hash,
        invitation_expires_at,
        invitation_accepted_at: null
      }
    });

    const isGov = request.requested_role === 'GOVERNMENT';
    await createAuditLog({
      user_id: adminUser.id,
      action: isGov ? 'GOVERNMENT_INVITATION_CREATED' : 'EVALUATOR_INVITATION_CREATED',
      entity_type: 'USER',
      entity_id: user.id,
      details: {
        action_type: 'RESEND',
        recipient_email: normalizedEmail,
        role: request.requested_role,
        expires_at: invitation_expires_at.toISOString()
      },
      ip_address
    });

    return {
      message: 'Invitation re-generated successfully. Old invitation tokens have been invalidated.',
      invitation: {
        setup_token: rawInvitationToken,
        setup_link: `/invite/accept?token=${rawInvitationToken}`,
        government_setup_link: `/government/set-password?token=${rawInvitationToken}`,
        expires_at: invitation_expires_at.toISOString()
      }
    };
  });
};

/**
 * Revoke Invitation (Admin only)
 */
export const revokeInvitation = async (id, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can revoke access invitations.');
  }

  return await prisma.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundError(`Access request with ID ${id} not found.`);
    }

    const normalizedEmail = request.email.trim().toLowerCase();
    const user = await tx.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      if (user.is_active && user.is_verified && user.invitation_accepted_at) {
        throw new BadRequestError('Cannot revoke invitation for an account that has already completed onboarding.');
      }
      await tx.user.update({
        where: { id: user.id },
        data: {
          invitation_token_hash: null,
          invitation_expires_at: null
        }
      });
    }

    const updated = await tx.accessRequest.update({
      where: { id },
      data: {
        status: 'UNDER_REVIEW',
        rejection_reason: 'Invitation revoked by administrator'
      }
    });

    await createAuditLog({
      user_id: adminUser.id,
      action: request.requested_role === 'GOVERNMENT' ? 'GOVERNMENT_INVITATION_REVOKED' : 'EVALUATOR_INVITATION_REVOKED',
      entity_type: 'ACCESS_REQUEST',
      entity_id: id,
      details: {
        applicant_email: normalizedEmail,
        requested_role: request.requested_role
      },
      ip_address
    });

    return updated;
  });
};

export default {
  createEvaluatorSelfApplication,
  createGovernmentAccessRequest,
  createGovernmentNomination,
  getAccessRequests,
  getAccessRequestById,
  reviewAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
  resendInvitation,
  revokeInvitation
};

