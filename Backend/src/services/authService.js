import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from './auditService.js';
import { sendEmailVerificationEmail } from './emailService.js';

export const register = async ({
  name,
  email,
  password,
  role,
  department_id = null,
  designation = null,
  phone = null,
  ip_address = null
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Password length enforcement (min 12 characters)
  if (!password || password.length < 12) {
    throw new BadRequestError('Password must be at least 12 characters long.');
  }

  if (role && role !== 'STARTUP') {
    throw new ForbiddenError('Self-registration is only permitted for STARTUP accounts.');
  }

  // Force STARTUP role for all public registrations unconditionally
  const assignedRole = 'STARTUP';

  // Check email conflict
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw new ConflictError('A user with this email address already exists.');
  }

  // Hash password with 12 bcrypt salt rounds
  const password_hash = await bcrypt.hash(password, 12);

  // Generate cryptographically secure raw verification token
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const email_verification_token_hash = crypto
    .createHash('sha256')
    .update(rawVerificationToken)
    .digest('hex');
  const email_verification_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create User with is_active = false and is_verified = false until email is verified
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role: assignedRole,
      department_id: department_id || null,
      designation: designation ? designation.trim() : null,
      phone: phone ? phone.trim() : null,
      is_active: false,
      is_verified: false,
      email_verification_token_hash,
      email_verification_expires_at
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
      updated_at: true
    }
  });

  // Create initial Startup record in DRAFT status without fabricated business defaults
  const startup = await prisma.startup.create({
    data: {
      user_id: user.id,
      company_name: data.company_name ? data.company_name.trim() : '',
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
  });

  // Dispatch real email verification
  let emailDelivered = false;
  try {
    await sendEmailVerificationEmail({
      email: user.email,
      name: user.name,
      rawToken: rawVerificationToken
    });
    emailDelivered = true;
  } catch (emailErr) {
    logger.error(`[AUTH] Verification email delivery failed for ${user.email}: ${emailErr.message}`);
  }

  // Create audit log
  await createAuditLog({
    user_id: user.id,
    action: 'USER_REGISTERED',
    entity_type: 'USER',
    entity_id: user.id,
    details: { role: user.role, email: user.email, email_delivered: emailDelivered },
    ip_address
  });

  // Return safe production response without raw token
  return {
    success: true,
    email_delivered: emailDelivered,
    message: emailDelivered
      ? 'Registration successful. Please check your email to verify your account.'
      : 'Account created, but verification email delivery failed. Please click "Resend Verification Email" to retry.',
    user,
    startup_id: startup.id,
    email_verification_required: true
  };
};

/**
 * Verify a startup user's email address using cryptographic token
 */
export const verifyEmail = async ({ token, ip_address = null }) => {
  if (!token || typeof token !== 'string') {
    throw new BadRequestError('Email verification token is required.');
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      email_verification_token_hash: tokenHash
    },
    include: {
      startups: true
    }
  });

  if (!user) {
    throw new BadRequestError('Invalid or expired email verification token.');
  }

  if (user.email_verification_expires_at && new Date() > new Date(user.email_verification_expires_at)) {
    throw new BadRequestError('Email verification link has expired. Please request a new verification link.');
  }

  // Activate user account (Email verified)
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      is_active: true,
      is_verified: true,
      email_verified_at: new Date(),
      email_verification_token_hash: null,
      email_verification_expires_at: null
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
      updated_at: true
    }
  });

  // Generate JWT token so user is authenticated
  const authToken = jwt.sign(
    { userId: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  await createAuditLog({
    user_id: updatedUser.id,
    action: 'USER_EMAIL_VERIFIED',
    entity_type: 'USER',
    entity_id: updatedUser.id,
    details: { email: updatedUser.email },
    ip_address
  });

  const startup = user.startups?.[0] || null;

  return {
    success: true,
    message: 'Email address successfully verified. You may now complete your organization profile and submit verification documents.',
    user: updatedUser,
    token: authToken,
    startup
  };
};

/**
 * Resend email verification link to user
 */
export const resendVerificationEmail = async ({ email, ip_address = null }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    // Return generic message to prevent email enumeration
    return {
      success: true,
      message: 'If an account exists with this email address, a new verification link has been sent.'
    };
  }

  if (user.is_verified && user.is_active) {
    return {
      success: true,
      message: 'This account email is already verified. You may sign in directly.'
    };
  }

  // Generate fresh token
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const email_verification_token_hash = crypto
    .createHash('sha256')
    .update(rawVerificationToken)
    .digest('hex');
  const email_verification_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email_verification_token_hash,
      email_verification_expires_at
    }
  });

  let emailAccepted = true;
  try {
    await sendEmailVerificationEmail({
      email: user.email,
      name: user.name,
      rawToken: rawVerificationToken
    });
  } catch (emailErr) {
    logger.warn(`[AUTH] Resend verification email provider warning for ${user.email}: ${emailErr.message}`);
    emailAccepted = false;
  }

  await createAuditLog({
    user_id: user.id,
    action: 'EMAIL_VERIFICATION_RESENT',
    entity_type: 'USER',
    entity_id: user.id,
    details: { email: user.email },
    ip_address
  });

  return {
    success: true,
    message: 'Verification email sent. Please check your inbox and click the verification link.'
  };
};

/**
 * Validate an invitation token
 */
export const validateInvitation = async (token) => {
  if (!token || typeof token !== 'string') {
    throw new BadRequestError('Invitation token is required.');
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const user = await prisma.user.findFirst({
    where: { invitation_token_hash: tokenHash },
    include: {
      department: {
        select: { id: true, name: true, state: true }
      }
    }
  });

  if (!user) {
    throw new BadRequestError('Invalid or expired invitation token.');
  }

  if (user.invitation_accepted_at) {
    throw new BadRequestError('This invitation has already been accepted. Please sign in with your credentials.');
  }

  if (user.invitation_expires_at && new Date(user.invitation_expires_at) < new Date()) {
    throw new BadRequestError('This invitation token has expired. Please request a new invitation from your administrator.');
  }

  return {
    valid: true,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department || null
  };
};

/**
 * Accept invitation, create credentials, and activate account
 * Role is strictly derived from verified User/AccessRequest - applicant cannot alter role.
 */
export const acceptInvitation = async ({ token, password, ip_address = null }) => {
  if (!token || !password) {
    throw new BadRequestError('Invitation token and password are required.');
  }

  if (password.length < 12) {
    throw new BadRequestError('Password must be at least 12 characters long.');
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const user = await prisma.user.findFirst({
    where: { invitation_token_hash: tokenHash }
  });

  if (!user) {
    await createAuditLog({
      user_id: null,
      action: 'INVITATION_REJECTED',
      entity_type: 'USER',
      entity_id: null,
      details: { reason: 'Invalid invitation token presented' },
      ip_address
    });
    throw new BadRequestError('Invalid invitation token.');
  }

  if (user.invitation_accepted_at) {
    throw new BadRequestError('This invitation has already been accepted. Please log in.');
  }

  if (user.invitation_expires_at && new Date(user.invitation_expires_at) < new Date()) {
    await createAuditLog({
      user_id: user.id,
      action: 'INVITATION_EXPIRED',
      entity_type: 'USER',
      entity_id: user.id,
      details: { email: user.email, expired_at: user.invitation_expires_at },
      ip_address
    });
    throw new BadRequestError('This invitation has expired. Please request a fresh invitation from an administrator.');
  }

  const password_hash = await bcrypt.hash(password, 12);

  // Activate the user account and consume token (prevent reuse!)
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash,
      invitation_token_hash: null,
      invitation_expires_at: null,
      invitation_accepted_at: new Date(),
      is_active: true,
      is_verified: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department_id: true,
      is_active: true,
      is_verified: true
    }
  });

  const isGov = user.role === 'GOVERNMENT';
  const isEval = user.role === 'EVALUATOR';

  // Note: Department verification is intentionally decoupled from individual officer onboarding (Section E).
  // Individual officer onboarding verifies the user account, but department verification remains an independent administrative decision.

  // Audit Logs
  await createAuditLog({
    user_id: user.id,
    action: isGov ? 'GOVERNMENT_CREDENTIALS_CREATED' : 'CREDENTIALS_CREATED',
    entity_type: 'USER',
    entity_id: user.id,
    details: { email: user.email, role: user.role },
    ip_address
  });

  await createAuditLog({
    user_id: user.id,
    action: isGov ? 'GOVERNMENT_ACCOUNT_ACTIVATED' : 'ACCOUNT_ACTIVATED',
    entity_type: 'USER',
    entity_id: user.id,
    details: { email: user.email, role: user.role, department_id: user.department_id },
    ip_address
  });

  await createAuditLog({
    user_id: user.id,
    action: isGov ? 'GOVERNMENT_INVITATION_ACCEPTED' : 'INVITATION_ACCEPTED',
    entity_type: 'USER',
    entity_id: user.id,
    details: { email: user.email, role: user.role },
    ip_address
  });

  return {
    success: true,
    message: `${user.role} account credentials created and activated successfully. You may now sign in.`,
    user: updatedUser
  };
};

export const login = async ({ email, password, ip_address = null }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          state: true,
          verification_status: true
        }
      },
      startups: {
        select: {
          id: true,
          company_name: true,
          verification_status: true,
          dpiit_number: true
        }
      },
      evaluator_profile: {
        select: {
          id: true,
          organization: true,
          designation: true,
          domain_expertise: true,
          verification_status: true
        }
      }
    }
  });

  if (!user) {
    await createAuditLog({
      user_id: null,
      action: 'LOGIN_FAILED',
      entity_type: 'USER',
      entity_id: null,
      details: { reason: 'User not found' },
      ip_address
    });
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Check if account is temporarily locked
  const now = new Date();
  if (user.locked_until && new Date(user.locked_until) > now) {
    await createAuditLog({
      user_id: user.id,
      action: 'LOGIN_FAILED',
      entity_type: 'USER',
      entity_id: user.id,
      details: { reason: 'Account locked' },
      ip_address
    });
    throw new UnauthorizedError('Account temporarily locked due to multiple failed login attempts. Please try again later.');
  }

  // If user has an unaccepted invitation token pending
  if (user.invitation_token_hash && !user.invitation_accepted_at) {
    throw new UnauthorizedError('Your account invitation has not been accepted yet. Please complete credential setup using your invitation link.');
  }

  // If startup user has unverified email
  if (user.role === 'STARTUP' && !user.is_verified && user.email_verification_token_hash) {
    throw new UnauthorizedError('Please verify your email address before signing in. Check your inbox for the verification link.');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('User account is not active. Please contact an administrator or verify your email.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    // If lockout has already expired, reset attempt counter baseline to 1, else increment
    const isLockoutExpired = user.locked_until && new Date(user.locked_until) <= now;
    const nextAttempts = isLockoutExpired ? 1 : (user.failed_login_attempts || 0) + 1;
    const isNowLocked = nextAttempts >= 3;
    const lockedUntil = isNowLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

    // Atomic DB update
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: nextAttempts,
        locked_until: lockedUntil,
        last_failed_login_at: now
      }
    });

    await createAuditLog({
      user_id: user.id,
      action: 'LOGIN_FAILED',
      entity_type: 'USER',
      entity_id: user.id,
      details: { attempt: nextAttempts, is_locked: isNowLocked },
      ip_address
    });

    if (isNowLocked) {
      await createAuditLog({
        user_id: user.id,
        action: 'ACCOUNT_LOCKED',
        entity_type: 'USER',
        entity_id: user.id,
        details: { failed_attempts: nextAttempts, locked_until: lockedUntil },
        ip_address
      });
      throw new UnauthorizedError('Account temporarily locked due to multiple failed login attempts. Please try again later.');
    }

    throw new UnauthorizedError('Invalid email or password.');
  }

  // Successful login: reset failed_login_attempts and locked_until
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failed_login_attempts: 0,
      locked_until: null
    }
  });

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  // Exclude password_hash from response
  const { password_hash, ...userProfile } = user;
  userProfile.failed_login_attempts = 0;
  userProfile.locked_until = null;

  // Record audit logs
  await createAuditLog({
    user_id: user.id,
    action: 'LOGIN_SUCCESS',
    entity_type: 'USER',
    entity_id: user.id,
    details: { role: user.role, email: user.email },
    ip_address
  });

  await createAuditLog({
    user_id: user.id,
    action: 'USER_LOGIN',
    entity_type: 'USER',
    entity_id: user.id,
    details: { role: user.role, email: user.email },
    ip_address
  });

  return { user: userProfile, token };
};

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
      updated_at: true,
      department: {
        select: {
          id: true,
          name: true,
          state: true,
          contact_email: true,
          verification_status: true
        }
      },
      startups: {
        select: {
          id: true,
          company_name: true,
          domain: true,
          verification_status: true,
          dpiit_number: true
        }
      },
      evaluator_profile: {
        select: {
          id: true,
          organization: true,
          designation: true,
          domain_expertise: true,
          verification_status: true
        }
      }
    }
  });

  if (!user) {
    throw new NotFoundError('User profile not found.');
  }

  return user;
};

export default {
  register,
  login,
  getCurrentUser,
  validateInvitation,
  acceptInvitation,
  verifyEmail,
  resendVerificationEmail
};
