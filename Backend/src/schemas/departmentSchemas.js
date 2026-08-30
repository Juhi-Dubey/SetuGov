import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(150),
  state: z.string().min(2, 'State must be at least 2 characters').max(100),
  contact_email: z.string().email('Invalid department contact email')
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  state: z.string().min(2).max(100).optional(),
  contact_email: z.string().email().optional()
});

export default {
  createDepartmentSchema,
  updateDepartmentSchema
};
