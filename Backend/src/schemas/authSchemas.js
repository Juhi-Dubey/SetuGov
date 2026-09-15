import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters long'),
  phone: z.string().optional().nullable(),
  role: z.enum(['STARTUP']).optional().default('STARTUP'),
  department_id: z.string().uuid('Invalid department ID format').optional().nullable()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Email verification token is required')
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10, 'Invitation token is required'),
  password: z.string().min(12, 'Password must be at least 12 characters long')
});

export const validateInvitationSchema = z.object({
  token: z.string().min(10, 'Invitation token is required')
});

export default {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  acceptInvitationSchema,
  validateInvitationSchema
};

