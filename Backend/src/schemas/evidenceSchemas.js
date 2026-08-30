import { z } from 'zod';

export const createEvidenceSchema = z.object({
  type: z.string().min(2, 'Evidence type is required (e.g., METRICS_EXPORT, AUDIT_REPORT, CCTV_LOG, PATIENT_SURVEY)'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  file_url: z.string().url('File URL must be a valid URL'),
  date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  source: z.string().min(2, 'Source is required')
});

export const updateEvidenceSchema = z.object({
  description: z.string().min(5).optional(),
  verification_status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional()
});

export default {
  createEvidenceSchema,
  updateEvidenceSchema
};
