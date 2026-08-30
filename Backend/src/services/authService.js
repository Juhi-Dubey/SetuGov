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
  role,
  department_id = null,
  ip_address = null
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Check email conflict
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw new ConflictError('A user with this email address already exists.');
  }

  // If department_id supplied, verify department exists
  if (department_id) {
    const department = await prisma.department.findUnique({
      where: { id: department_id }
    });
    if (!department) {
      throw new BadRequestError('Specified department does not exist.');
    }
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Create User
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role,
      department_id,
      is_active: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department_id: true,
      is_active: true,
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

  // Record audit log
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

export const login = async ({ email, password, ip_address = null }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          state: true
        }
      },
      startups: {
        select: {
          id: true,
          company_name: true,
          verification_status: true
        }
      }
    }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  if (!user.is_active) {
    throw new ForbiddenError('User account has been deactivated. Please contact an administrator.');
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
      is_active: true,
      created_at: true,
      updated_at: true,
      department: {
        select: {
          id: true,
          name: true,
          state: true,
          contact_email: true
        }
      },
      startups: {
        select: {
          id: true,
          company_name: true,
          domain: true,
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
  getCurrentUser
};
