import { z } from 'zod';

export const createPaymentSchema = z.object({
  milestone_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  payment_percentage: z.number().min(0).max(100),
  status: z.enum(['UPCOMING', 'PENDING', 'PAID', 'REJECTED']).default('UPCOMING'),
  payment_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable()
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['UPCOMING', 'PENDING', 'PAID', 'REJECTED'], {
    errorMap: () => ({ message: 'Payment status must be UPCOMING, PENDING, PAID, or REJECTED' })
  }),
  payment_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional()
});

export default {
  createPaymentSchema,
  updatePaymentStatusSchema
};
