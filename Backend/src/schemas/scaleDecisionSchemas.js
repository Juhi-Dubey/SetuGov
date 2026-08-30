import { z } from 'zod';

export const createScaleDecisionSchema = z.object({
  decision: z.enum(['SCALE', 'EXTEND', 'STOP'], {
    errorMap: () => ({ message: 'Decision must be SCALE, EXTEND, or STOP' })
  }),
  score: z.number().min(0).max(100).optional(),
  reasoning: z.string().min(10, 'Reasoning must be at least 10 characters')
});

export default {
  createScaleDecisionSchema
};
