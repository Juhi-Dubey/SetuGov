import { z } from 'zod';

export const createPilotSchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID'),
  startup_id: z.string().uuid('Invalid startup ID'),
  location: z.string().min(2, 'Location is required'),
  start_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  end_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  budget: z.number().positive('Budget must be positive')
});

export const updatePilotSchema = z.object({
  location: z.string().min(2).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().positive().optional(),
  status: z.enum(['PLANNED', 'RUNNING', 'AT_RISK', 'VALIDATION', 'COMPLETED', 'SCALED', 'EXTENDED', 'STOPPED']).optional(),
  overall_score: z.number().min(0).max(100).optional(),
  final_recommendation: z.string().optional()
});

export const createProgressUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1, 'Update description cannot be empty').optional(),
  updateText: z.string().trim().min(1, 'Update text cannot be empty').optional()
}).refine(
  (data) => (data.description && data.description.trim().length > 0) || (data.updateText && data.updateText.trim().length > 0),
  {
    message: 'Progress update description cannot be empty',
    path: ['description']
  }
);

export const createPilotFeedbackSchema = z.object({
  citizen_name: z
    .string()
    .trim()
    .max(100, 'Name cannot exceed 100 characters')
    .optional()
    .nullable(),

  beneficiary_type: z
    .enum([
      'CITIZEN',
      'BENEFICIARY',
      'GOVERNMENT',
      'NGO',
      'OTHER'
    ])
    .optional()
    .default('CITIZEN'),

  rating: z.coerce
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),

  comments: z
    .string()
    .trim()
    .min(3, 'Feedback must contain at least 3 characters')
    .max(2000, 'Feedback cannot exceed 2000 characters'),

  respondent_role: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable(),

  stakeholder_type: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
}).strict();

export default {
  createPilotSchema,
  updatePilotSchema,
  createProgressUpdateSchema,
  createPilotFeedbackSchema,
};
