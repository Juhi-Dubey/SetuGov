import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['GOVERNMENT', 'STARTUP', 'EVALUATOR', 'ADMIN'], {
    errorMap: () => ({ message: 'Role must be GOVERNMENT, STARTUP, EVALUATOR, or ADMIN' })
  }),
  department_id: z.string().uuid('Invalid department ID format').optional().nullable()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export default {
  registerSchema,
  loginSchema
};
