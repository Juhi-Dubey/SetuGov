import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';
import {
  sendInvitationEmail,
  sendAccessRequestEmail,
  sendAccessRequestUnderReviewEmail,
  sendAccessRequestRejectedEmail
} from './emailService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

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
    throw new BadRequestError('Evaluator name, professional email, and motivation statement are required.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const expertiseArray = Array.isArray(domain_expertise)
    ? domain_expertise
    : (domain_expertise ? domain_expertise.split(',').map(s => s.trim()).filter(Boolean) : ['General Innovation']);

  const orgName = (employment_type === 'INDEPENDENT' || !organization)
    ? (organization?.trim() || 'Independent Consultant')
    : organization.trim();

  const accessRequest = await prisma.$transaction(async (tx) => {
    // Check if active verified user already exists
    const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser && existingUser.is_active && existingUser.is_verified) {
      throw new BadRequestError(`An active verified account with email '${normalizedEmail}' already exists.`);
    }

    // Atomic Duplicate Active Request Protection (Phase 3 Concurrency Hardening)
    const existingActiveRequest = await tx.accessRequest.findFirst({
      where: {
        email: normalizedEmail,
        status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }
      }
    });
    if (existingActiveRequest) {
      if (existingActiveRequest.status === 'PENDING' || existingActiveRequest.status === 'UNDER_REVIEW') {
        throw new ConflictError('An access request for this email is currently pending review.');
      }
      if (existingActiveRequest.status === 'APPROVED') {
        throw new ConflictError('An approved access request already exists for this email. Please check your invitation or contact support.');
      }
    }

    return await tx.accessRequest.create({
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
  }, { maxWait: 10000, timeout: 15000 });

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

  // ─── POST-COMMIT: Dispatch Evaluator Access Request Email ──────────────────
  try {
    await sendAccessRequestEmail({
      role: 'EVALUATOR',
      recipientEmail: normalizedEmail,
      applicantName: name.trim(),
      applicantEmail: normalizedEmail,
      details: {
        organization: orgName,
        designation: designation ? designation.trim() : 'Innovation Evaluator',
        domainExpertise: expertiseArray.join(', ')
      }
    });
  } catch (emailErr) {
    console.error(`[ACCESS REQUEST EMAIL] Delivery failed for ${normalizedEmail}: ${emailErr.message}`);
    throw emailErr;
  }

  // Also dispatch Admin notification if ADMIN_NOTIFICATION_EMAIL is configured and different from applicant
  if (config.ADMIN_NOTIFICATION_EMAIL && config.ADMIN_NOTIFICATION_EMAIL.toLowerCase().trim() !== normalizedEmail) {
    try {
      await sendAccessRequestEmail({
        role: 'EVALUATOR',
        recipientEmail: config.ADMIN_NOTIFICATION_EMAIL.trim(),
        applicantName: name.trim(),
        applicantEmail: normalizedEmail,
        details: {
          organization: orgName,
          designation: designation ? designation.trim() : 'Innovation Evaluator',
          domainExpertise: expertiseArray.join(', ')
        }
      });
    } catch (adminEmailErr) {
      console.warn(`[ACCESS REQUEST EMAIL] Admin notification failed: ${adminEmailErr.message}`);
    }
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

  const accessRequest = await prisma.$transaction(async (tx) => {
    // Check if active verified user already exists or belongs to another role
    const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });
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

    // Atomic Duplicate Active Request Protection (Phase 3 Concurrency Hardening)
    const existingActiveRequest = await tx.accessRequest.findFirst({
      where: {
        email: normalizedEmail,
        status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }
      }
    });
    if (existingActiveRequest) {
      if (existingActiveRequest.status === 'PENDING' || existingActiveRequest.status === 'UNDER_REVIEW') {
        throw new ConflictError('An access request for this email is currently pending review.');
      }
      if (existingActiveRequest.status === 'APPROVED') {
        throw new ConflictError('An approved access request already exists for this email. Please check your invitation or contact support.');
      }
    }

    // Department Security: Match existing department if possible, otherwise keep department_id null for Admin review
    let matchedDepartmentId = null;
    if (department_id) {
      const dep = await tx.department.findUnique({ where: { id: department_id } });
      if (dep) matchedDepartmentId = dep.id;
    }

    if (!matchedDepartmentId) {
      const existingDept = await tx.department.findFirst({
        where: {
          name: { equals: department_name.trim(), mode: 'insensitive' },
          state: { equals: state.trim(), mode: 'insensitive' }
        }
      });
      if (existingDept) {
        matchedDepartmentId = existingDept.id;
      }
    }

    return await tx.accessRequest.create({
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
  }, { maxWait: 10000, timeout: 15000 });

  await createAuditLog({
    user_id: null,
    action: 'GOVERNMENT_ACCESS_REQUEST_SUBMITTED',
    entity_type: 'ACCESS_REQUEST',
    entity_id: accessRequest.id,
    details: {
      requested_role: 'GOVERNMENT',
      request_source: 'SELF_REQUEST',
      email: normalizedEmail,
      department_id: accessRequest.department_id,
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

  // ─── POST-COMMIT: Dispatch Government Access Request Email ─────────────────
  try {
    await sendAccessRequestEmail({
      role: 'GOVERNMENT',
      recipientEmail: normalizedEmail,
      applicantName: name.trim(),
      applicantEmail: normalizedEmail,
      details: {
        departmentName: department_name.trim(),
        state: state.trim(),
        designation: designation ? designation.trim() : 'Department Nodal Officer',
        organization: organization ? organization.trim() : department_name.trim()
      }
    });
  } catch (emailErr) {
    console.error(`[ACCESS REQUEST EMAIL] Delivery failed for ${normalizedEmail}: ${emailErr.message}`);
    throw emailErr;
  }

  // Also dispatch Admin notification if ADMIN_NOTIFICATION_EMAIL is configured and different from applicant
  if (config.ADMIN_NOTIFICATION_EMAIL && config.ADMIN_NOTIFICATION_EMAIL.toLowerCase().trim() !== normalizedEmail) {
    try {
      await sendAccessRequestEmail({
        role: 'GOVERNMENT',
        recipientEmail: config.ADMIN_NOTIFICATION_EMAIL.trim(),
        applicantName: name.trim(),
        applicantEmail: normalizedEmail,
        details: {
          departmentName: department_name.trim(),
          state: state.trim(),
          designation: designation ? designation.trim() : 'Department Nodal Officer',
          organization: organization ? organization.trim() : department_name.trim()
        }
      });
    } catch (adminEmailErr) {
      console.warn(`[ACCESS REQUEST EMAIL] Admin notification failed: ${adminEmailErr.message}`);
    }
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

  const accessRequest = await prisma.$transaction(async (tx) => {
    // Check if active verified user already exists or belongs to another role
    const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });
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

    // Atomic Duplicate Active Request Protection (Phase 3 Concurrency Hardening)
    const existingActiveRequest = await tx.accessRequest.findFirst({
      where: {
        email: normalizedEmail,
        status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }
      }
    });
    if (existingActiveRequest) {
      if (existingActiveRequest.status === 'PENDING' || existingActiveRequest.status === 'UNDER_REVIEW') {
        throw new ConflictError('An access request for this email is currently pending review.');
      }
      if (existingActiveRequest.status === 'APPROVED') {
        throw new ConflictError('An approved access request already exists for this email. Please check your invitation or contact support.');
      }
    }

    // Challenge Authorization Scoping: If challenge_id is provided, verify authorization
    let validatedChallengeId = null;
    if (challenge_id) {
      const challenge = await tx.challenge.findUnique({ where: { id: challenge_id } });
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
    return await tx.accessRequest.create({
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
  }, { maxWait: 10000, timeout: 15000 });

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

  // Post-commit: send UNDER_REVIEW email to applicant
  try {
    const emailResult = await sendAccessRequestUnderReviewEmail({
      recipientEmail: request.email,
      applicantName: request.name,
      role: request.requested_role
    });

    logger.info(
      `[ACCESS REQUEST UNDER REVIEW EMAIL] Sent via ${emailResult?.provider || 'provider'}. Message ID: ${emailResult?.messageId || 'unknown'}`
    );
  } catch (emailErr) {
    logger.error(
      `[ACCESS REQUEST UNDER REVIEW EMAIL] Failed: ${emailErr.message}`
    );
  }

  return updated;
};

/**
 * Approve Access Request & Generate Secure Invitation Token (Admin only)
 *
 * Security rule: Does NOT activate the account immediately.
 * Account becomes ACTIVE only when the officer/evaluator accepts the invitation
 * and creates their own password.
 *
 * Email is deliberately sent AFTER the DB transaction commits so that a slow
 * or failing email provider cannot hold the transaction open long enough to
 * trigger the "Transaction already closed" timeout.
 */
export const approveAccessRequest = async (id, data = {}, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can approve access requests.');
  }

  const approvalStartedAt = Date.now();

  // ─── PRE-TRANSACTION: cpu-heavy work that must not hold a DB connection ───

  // Generate token material BEFORE opening the transaction so the tx contains
  // only fast DB writes.
  const rawInvitationToken = crypto.randomBytes(32).toString('hex');
  const invitation_token_hash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
  const expiryHours = config.INVITATION_EXPIRY_HOURS || 48;
  const invitation_expires_at = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // bcrypt with cost 12 can take 200-400 ms. Running it inside a 5s Prisma
  // transaction would consume a large fraction of the budget; run it here.
  const unguessablePlaceholder = crypto.randomBytes(32).toString('hex');
  const tempPasswordHash = await bcrypt.hash(unguessablePlaceholder, 12);

  // ─── TRANSACTION: fast DB writes only ─────────────────────────────────────

  let txResult;
  try {
    txResult = await prisma.$transaction(async (tx) => {
      const txStart = Date.now();
      let stepStart = txStart;

      const request = await tx.accessRequest.findUnique({
        where: { id },
        include: { department: true }
      });
      console.info(`[APPROVE] accessRequest.findUnique: ${Date.now() - stepStart}ms`);
      stepStart = Date.now();

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
      console.info(`[APPROVE] user.findUnique: ${Date.now() - stepStart}ms`);
      stepStart = Date.now();

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
        const deptFindStart = Date.now();
        let dept = await tx.department.findFirst({
          where: {
            name: { equals: deptName, mode: 'insensitive' },
            state: { equals: deptState, mode: 'insensitive' }
          }
        });
        console.info(`[APPROVE] department.findFirst: ${Date.now() - deptFindStart}ms`);
        if (!dept) {
          const deptCreateStart = Date.now();
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
          console.info(`[APPROVE] department.create: ${Date.now() - deptCreateStart}ms`);
        }
        targetDepartmentId = dept.id;
      }
      stepStart = Date.now();

      // Create or update User in UNACTIVATED state
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
            is_active: false,
            is_verified: false
          }
        });
        console.info(`[APPROVE] user.update: ${Date.now() - stepStart}ms`);
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
            is_active: false,
            is_verified: false
          }
        });
        console.info(`[APPROVE] user.create: ${Date.now() - stepStart}ms`);
      }
      stepStart = Date.now();

      // If Evaluator, prepare unverified EvaluatorProfile
      if (request.requested_role === 'EVALUATOR') {
        const evalUpsertStart = Date.now();
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
        console.info(`[APPROVE] evaluatorProfile.upsert: ${Date.now() - evalUpsertStart}ms`);
      }
      stepStart = Date.now();

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
      console.info(`[APPROVE] accessRequest.update: ${Date.now() - stepStart}ms`);
      stepStart = Date.now();

      const isGov = request.requested_role === 'GOVERNMENT';

      // Audit logs share the same transaction so they roll back atomically
      // if the transaction fails.
      await createAuditLog({
        tx,
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
      console.info(`[APPROVE] auditLog 1: ${Date.now() - stepStart}ms`);
      stepStart = Date.now();

      await createAuditLog({
        tx,
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
      console.info(`[APPROVE] auditLog 2: ${Date.now() - stepStart}ms`);
      console.info(`[APPROVE] total transaction duration: ${Date.now() - txStart}ms`);

      // Return everything post-commit email delivery will need
      return {
        updatedRequest,
        user,
        normalizedEmail,
        departmentName: request.department_name || (request.department ? request.department.name : null),
        requestedRole: request.requested_role,
        isGov
      };
    }, {
      // Generous maxWait (10s) and timeout (15s) for Neon connection pool acquisition and DB writes
      maxWait: 10000,
      timeout: 15000
    });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw new BadRequestError('An account with this email address already exists.');
    }
    // Translate Prisma-specific transaction errors into clearer messages
    const msg = err?.message || '';
    if (msg.includes('Transaction already closed') || msg.includes('transaction was expired')) {
      throw new Error(
        'Database transaction timed out during approval. Please retry the approval.'
      );
    }
    throw err;
  }

  const dbElapsedMs = Date.now() - approvalStartedAt;
  console.info(
    `[APPROVE] DB transaction committed in ${dbElapsedMs}ms for access_request=${id} role=${txResult.requestedRole}`
  );

  // ─── POST-COMMIT: send invitation email ────────────────────────────────────
  // Email is intentionally outside the transaction. A slow or failing provider
  // will NOT roll back the approved account. If delivery fails the Admin can
  // use the resend-invitation endpoint.
  let emailResult = { email_accepted_by_provider: false, provider: null };
  try {
    emailResult = await sendInvitationEmail({
      email: txResult.normalizedEmail,
      name: txResult.updatedRequest.name || txResult.user.name,
      role: txResult.requestedRole,
      rawToken: rawInvitationToken,
      departmentName: txResult.departmentName
    });
    console.info(
      `[APPROVE] Invitation email dispatched to ${txResult.normalizedEmail} via provider=${emailResult?.provider || 'unknown'}`
    );
  } catch (emailErr) {
    // Log the failure but do NOT throw — the account is already approved in DB.
    console.error(
      `[APPROVE] Invitation email delivery FAILED for ${txResult.normalizedEmail}: ${emailErr?.message || emailErr}. ` +
      'Admin can resend via the resend-invitation endpoint.'
    );
    // Record the delivery failure asynchronously (best-effort, non-blocking)
    createAuditLog({
      user_id: adminUser.id,
      action: 'INVITATION_EMAIL_DELIVERY_FAILED',
      entity_type: 'USER',
      entity_id: txResult.user.id,
      details: {
        recipient_email: txResult.normalizedEmail,
        error: emailErr?.message || String(emailErr)
      },
      ip_address
    }).catch(() => {});

    emailResult = { email_accepted_by_provider: false, provider: null, delivery_failed: true };
  }

  const totalElapsedMs = Date.now() - approvalStartedAt;
  console.info(`[APPROVE] Total approval completed in ${totalElapsedMs}ms for access_request=${id}`);

  return {
    request: txResult.updatedRequest,
    user: {
      id: txResult.user.id,
      name: txResult.user.name,
      email: txResult.user.email,
      role: txResult.user.role,
      is_active: txResult.user.is_active,
      is_verified: txResult.user.is_verified
    },
    invitation: {
      // setup_token is the RAW (unhashed) token. It is returned here for
      // server-side use (test suites, admin tooling). It is NOT forwarded
      // to external API clients by the HTTP controller.
      setup_token: rawInvitationToken,
      expires_at: invitation_expires_at.toISOString(),
      email_accepted_by_provider: emailResult.email_accepted_by_provider,
      ...(emailResult.delivery_failed && {
        email_delivery_warning: 'Invitation email could not be delivered. The account has been approved. Use resend-invitation to retry.'
      })
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

  const { updated, request } = await prisma.$transaction(async (tx) => {
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
      tx,
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

    return { updated, request };
  }, {
    maxWait: 10000,
    timeout: 15000
  });

  // Post-commit: send REJECTED email to applicant
  try {
    const emailResult = await sendAccessRequestRejectedEmail({
      recipientEmail: request.email,
      applicantName: request.name,
      role: request.requested_role,
      rejectionReason: rejection_reason.trim()
    });

    logger.info(
      `[ACCESS REQUEST REJECTED EMAIL] Sent via ${emailResult?.provider || 'provider'}. Message ID: ${emailResult?.messageId || 'unknown'}`
    );
  } catch (emailErr) {
    logger.error(
      `[ACCESS REQUEST REJECTED EMAIL] Failed: ${emailErr.message}`
    );
  }

  return updated;
};

/**
 * Resend / Re-generate Invitation Token (Admin only)
 *
 * Invalidates old invitation token and generates a new 48h token.
 * Email is sent AFTER the DB transaction commits to avoid holding the
 * transaction open during a slow external HTTP call.
 */
export const resendInvitation = async (id, adminUser, ip_address = null) => {
  if (adminUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only Administrators can resend access invitations.');
  }

  // ─── PRE-TRANSACTION: generate new token before opening the tx ────────────
  const rawInvitationToken = crypto.randomBytes(32).toString('hex');
  const invitation_token_hash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
  const expiryHours = config.INVITATION_EXPIRY_HOURS || 48;
  const invitation_expires_at = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // ─── TRANSACTION: fast DB writes only ─────────────────────────────────────
  const txResult = await prisma.$transaction(async (tx) => {
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

    // Invalidate old token and store the new hash
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
      tx,
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
      request,
      user,
      normalizedEmail
    };
  }, {
    maxWait: 10000,
    timeout: 15000
  });

  // ─── POST-COMMIT: send invitation email ────────────────────────────────────
  let emailResult = { email_accepted_by_provider: false };
  try {
    emailResult = await sendInvitationEmail({
      email: txResult.normalizedEmail,
      name: txResult.request.name,
      role: txResult.request.requested_role,
      rawToken: rawInvitationToken,
      departmentName: txResult.request.department_name || null
    });
  } catch (emailErr) {
    console.error(
      `[RESEND_INVITE] Email delivery FAILED for ${txResult.normalizedEmail}: ${emailErr?.message || emailErr}. ` +
      'New token has been saved; Admin can retry via this endpoint again.'
    );
    createAuditLog({
      user_id: adminUser.id,
      action: 'INVITATION_EMAIL_DELIVERY_FAILED',
      entity_type: 'USER',
      entity_id: txResult.user.id,
      details: {
        action_type: 'RESEND',
        recipient_email: txResult.normalizedEmail,
        error: emailErr?.message || String(emailErr)
      },
      ip_address
    }).catch(() => {});

    emailResult = { email_accepted_by_provider: false, delivery_failed: true };
  }

  return {
    message: emailResult.delivery_failed
      ? 'Invitation token has been re-generated. Email delivery failed — please retry.'
      : 'Invitation re-generated and sent via email successfully. Old invitation tokens have been invalidated.',
    invitation: {
      // setup_token is the RAW (unhashed) token. Returned for server-side use
      // (test suites, admin tooling). Not forwarded to external API clients.
      setup_token: rawInvitationToken,
      expires_at: invitation_expires_at.toISOString(),
      email_accepted_by_provider: emailResult.email_accepted_by_provider,
      ...(emailResult.delivery_failed && {
        email_delivery_warning: 'Email could not be delivered. The new token is valid. Use this endpoint again to retry.'
      })
    }
  };
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
      tx,
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
  }, {
    maxWait: 10000,
    timeout: 15000
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

