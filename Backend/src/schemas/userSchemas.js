import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  department_id: z.string().uuid().optional().nullable()
});

export const updateUserStatusSchema = z.object({
  is_active: z.boolean({
    required_error: 'is_active boolean is required'
  })
});

export default {
  updateUserSchema,
  updateUserStatusSchema
};
