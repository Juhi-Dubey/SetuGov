import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

export const register = async ({
  name,
  email,
  password,
  role = 'STARTUP',
  department_id = null,
  designation = null,
  phone = null,
  ip_address = null
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Task 1: Public registration is strictly for STARTUP accounts only
  if (role && role !== 'STARTUP') {
    throw new ForbiddenError(
      'Public registration is permitted for STARTUP accounts only. Privileged accounts (GOVERNMENT, EVALUATOR, ADMIN) must be provisioned by an administrator.'
    );
  }

  // Force STARTUP role for all public registrations
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

  // Create User
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role: assignedRole,
      department_id: null,
      designation: designation ? designation.trim() : null,
      phone: phone ? phone.trim() : null,
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
      updated_at: true,
      department: {
        select: {
          id: true,
          name: true,
          state: true
        }
      }
    }
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  // Create audit log
  await createAuditLog({
    user_id: user.id,
    action: 'USER_REGISTERED',
    entity_type: 'USER',
    entity_id: user.id,
    details: { role: user.role, email: user.email },
    ip_address
  });

  return { user, token };
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
    throw new UnauthorizedError('Invalid email or password.');
  }

  // If user has an unaccepted invitation token pending
  if (user.invitation_token_hash && !user.invitation_accepted_at) {
    throw new UnauthorizedError('Your account invitation has not been accepted yet. Please complete credential setup using your invitation link.');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('User account is not active. Please contact an administrator.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  // Exclude password_hash from response
  const { password_hash, ...userProfile } = user;

  // Record audit log for login
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
  acceptInvitation
};
