import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  department_id: z.string().uuid().optional().nullable()
}).strict();

export const updateUserStatusSchema = z.object({
  is_active: z.boolean({
    required_error: 'is_active boolean is required'
  })
}).strict();

export const updateUserVerificationSchema = z.object({
  is_verified: z.boolean({
    required_error: 'is_verified boolean is required'
  })
}).strict();

export default {
  updateUserSchema,
  updateUserStatusSchema,
  updateUserVerificationSchema
};


