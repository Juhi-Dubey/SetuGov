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

export default {
  createPilotSchema,
  updatePilotSchema
};
