import { z } from 'zod';

export const createEvaluationSchema = z.object({
  technical_score: z.number().min(0).max(100, 'Technical score must be between 0 and 100').optional().default(0),
  innovation_score: z.number().min(0).max(100, 'Innovation score must be between 0 and 100').optional().default(0),
  impact_score: z.number().min(0).max(100, 'Impact score must be between 0 and 100').optional().default(0),
  scalability_score: z.number().min(0).max(100, 'Scalability score must be between 0 and 100').optional().default(0),
  cost_score: z.number().min(0).max(100, 'Cost score must be between 0 and 100').optional().default(0),
  comments: z.string().optional().default(''),
  is_draft: z.boolean().optional().default(false)
}).superRefine((data, ctx) => {
  if (!data.is_draft) {
    if (!data.comments || data.comments.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Evaluation comments must be at least 5 characters for final submission.',
        path: ['comments']
      });
    }
  }
});

export const updateEvaluationSchema = z.object({
  technical_score: z.number().min(0).max(100).optional(),
  innovation_score: z.number().min(0).max(100).optional(),
  impact_score: z.number().min(0).max(100).optional(),
  scalability_score: z.number().min(0).max(100).optional(),
  cost_score: z.number().min(0).max(100).optional(),
  comments: z.string().min(5).optional()
});

export default {
  createEvaluationSchema,
  updateEvaluationSchema
};
