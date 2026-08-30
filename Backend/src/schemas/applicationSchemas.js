import { z } from 'zod';

export const createApplicationSchema = z.object({
  proposal: z.string().min(20, 'Proposal must be at least 20 characters'),
  technical_approach: z.string().min(20, 'Technical approach must be at least 20 characters'),
  expected_impact: z.string().min(20, 'Expected impact must be at least 20 characters'),
  estimated_cost: z.number().positive('Estimated cost must be positive'),
  timeline: z.string().min(5, 'Timeline is required (e.g., 60 days in 3 phases)'),
  status: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED')
});

export const updateApplicationSchema = z.object({
  proposal: z.string().min(20).optional(),
  technical_approach: z.string().min(20).optional(),
  expected_impact: z.string().min(20).optional(),
  estimated_cost: z.number().positive().optional(),
  timeline: z.string().min(5).optional()
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'SHORTLISTED', 'REJECTED', 'SELECTED'], {
    errorMap: () => ({ message: 'Invalid application status' })
  }),
  reason: z.string().optional()
});

export default {
  createApplicationSchema,
  updateApplicationSchema,
  updateApplicationStatusSchema
};
