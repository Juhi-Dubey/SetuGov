import { z } from 'zod';

export const createValidationSchema = z.object({
  performance_score: z.number().min(0).max(100),
  kpi_achievement_score: z.number().min(0).max(100),
  evidence_quality_score: z.number().min(0).max(100),
  technical_stability_score: z.number().min(0).max(100),
  user_satisfaction_score: z.number().min(0).max(100),
  comments: z.string().min(5, 'Validation comments must be at least 5 characters'),
  status: z.enum(['VALIDATED', 'VALIDATED_WITH_CONDITIONS', 'NOT_VALIDATED']).default('VALIDATED')
});

export const updateValidationSchema = z.object({
  performance_score: z.number().min(0).max(100).optional(),
  kpi_achievement_score: z.number().min(0).max(100).optional(),
  evidence_quality_score: z.number().min(0).max(100).optional(),
  technical_stability_score: z.number().min(0).max(100).optional(),
  user_satisfaction_score: z.number().min(0).max(100).optional(),
  comments: z.string().min(5).optional(),
  status: z.enum(['VALIDATED', 'VALIDATED_WITH_CONDITIONS', 'NOT_VALIDATED']).optional()
});

export default {
  createValidationSchema,
  updateValidationSchema
};
