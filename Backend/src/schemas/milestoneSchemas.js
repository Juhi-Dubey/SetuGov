import { z } from 'zod';

export const createMilestoneSchema = z.object({
  name: z.string().min(2, 'Milestone name must be at least 2 characters').max(150),
  description: z.string().optional(),
  due_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  completion_percentage: z.number().min(0).max(100).default(0),
  payment_percentage: z.number().min(0).max(100).default(0),
  evidence_url: z.string().url().optional().nullable()
});

export const updateMilestoneSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().optional(),
  due_date: z.string().optional(),
  status: z.string().optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
  payment_percentage: z.number().min(0).max(100).optional(),
  evidence_url: z.string().url().optional().nullable()
});

export default {
  createMilestoneSchema,
  updateMilestoneSchema
};
