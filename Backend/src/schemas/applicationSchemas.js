import { z } from 'zod';

export const createApplicationSchema = z.object({
  proposal: z.string().min(20, 'Proposal must be at least 20 characters').optional(),
  proposal_summary: z.string().min(20).optional(),
  problemUnderstanding: z.string().min(20).optional(),
  technical_approach: z.string().min(20, 'Technical approach must be at least 20 characters').optional(),
  proposedSolution: z.string().min(20).optional(),
  expected_impact: z.string().min(20, 'Expected impact must be at least 20 characters').optional(),
  expectedImpact: z.string().min(20).optional(),
  estimated_cost: z.number().positive('Estimated cost must be positive').optional(),
  proposed_budget: z.number().positive().optional(),
  proposedBudget: z.number().positive().optional(),
  timeline: z.string().min(3, 'Timeline is required (e.g., 60 days in 3 phases)').optional(),
  proposed_timeline_days: z.union([z.number().positive(), z.string()]).optional(),
  proposedTimeline: z.union([z.number().positive(), z.string()]).optional(),
  challenge_id: z.string().uuid().optional(),
  challengeId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED')
}).refine(data => (data.proposal || data.proposal_summary || data.problemUnderstanding), {
  message: 'Proposal or problem understanding is required (minimum 20 characters)',
  path: ['proposal']
}).refine(data => (data.technical_approach || data.proposedSolution), {
  message: 'Technical approach or proposed solution is required (minimum 20 characters)',
  path: ['technical_approach']
}).refine(data => (data.expected_impact || data.expectedImpact), {
  message: 'Expected impact description is required (minimum 20 characters)',
  path: ['expected_impact']
}).refine(data => (data.estimated_cost !== undefined || data.proposed_budget !== undefined || data.proposedBudget !== undefined), {
  message: 'Estimated cost or proposed budget must be provided and positive',
  path: ['estimated_cost']
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
