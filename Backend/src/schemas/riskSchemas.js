import { z } from 'zod';

export const createRiskSchema = z.object({
  category: z.enum(['TECHNICAL', 'CYBERSECURITY', 'DATA', 'PERFORMANCE', 'OPERATIONAL', 'FINANCIAL'], {
    errorMap: () => ({ message: 'Category must be TECHNICAL, CYBERSECURITY, DATA, PERFORMANCE, OPERATIONAL, or FINANCIAL' })
  }),
  description: z.string().min(5, 'Risk description must be at least 5 characters'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  mitigation: z.string().min(5, 'Mitigation strategy must be at least 5 characters'),
  owner: z.string().min(2, 'Risk owner is required'),
  due_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional()
});

export const updateRiskSchema = z.object({
  category: z.enum(['TECHNICAL', 'CYBERSECURITY', 'DATA', 'PERFORMANCE', 'OPERATIONAL', 'FINANCIAL']).optional(),
  description: z.string().min(5).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  mitigation: z.string().min(5).optional(),
  owner: z.string().min(2).optional(),
  due_date: z.string().optional(),
  status: z.enum(['IDENTIFIED', 'MITIGATED', 'ACCEPTED', 'CLOSED']).optional()
});

export default {
  createRiskSchema,
  updateRiskSchema
};
