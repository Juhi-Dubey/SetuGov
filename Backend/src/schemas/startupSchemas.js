import { z } from 'zod';

export const createStartupSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters').max(150),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  domain: z.string().min(2, 'Domain is required (e.g., Healthcare, Transportation, Urban Governance)'),
  technologies: z.array(z.string()).min(1, 'At least one technology must be listed'),
  readiness_level: z.number().int().min(1).max(9).default(1), // Technology Readiness Level 1-9
  years_experience: z.number().int().min(0).default(0),
  previous_deployments: z.number().int().min(0).default(0),
  location: z.string().min(2, 'Location is required')
});

export const updateStartupSchema = z.object({
  company_name: z.string().min(2).max(150).optional(),
  description: z.string().min(20).optional(),
  domain: z.string().min(2).optional(),
  technologies: z.array(z.string()).optional(),
  readiness_level: z.number().int().min(1).max(9).optional(),
  years_experience: z.number().int().min(0).optional(),
  previous_deployments: z.number().int().min(0).optional(),
  location: z.string().min(2).optional()
});

export const addDocumentSchema = z.object({
  document_type: z.string().min(2, 'Document type is required (e.g. DPIIT_RECOGNITION, GST_CERTIFICATE, PITCH_DECK)'),
  document_url: z.string().url('Document URL must be a valid URL').refine(url => /^https?:\/\//i.test(url), { message: 'Document URL must use http or https' })
});

export const verifyStartupSchema = z.object({
  verification_status: z.enum(['VERIFIED', 'REJECTED', 'PENDING'], {
    errorMap: () => ({ message: 'Verification status must be VERIFIED, REJECTED, or PENDING' })
  }),
  comments: z.string().optional()
});

export default {
  createStartupSchema,
  updateStartupSchema,
  addDocumentSchema,
  verifyStartupSchema
};
