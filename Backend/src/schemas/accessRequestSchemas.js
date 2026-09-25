import { z } from 'zod';

const phoneRegex = /^[+\d\s\-().]{7,25}$/;

export const createGovernmentAccessRequestSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Official government email is required').max(255, 'Email cannot exceed 255 characters'),
  phone: z.string().trim().max(25, 'Phone cannot exceed 25 characters').refine(val => !val || phoneRegex.test(val), { message: 'Invalid phone number format' }).optional().nullable().or(z.literal('')),
  department_name: z.string().trim().min(2, 'Department name is required').max(150, 'Department name cannot exceed 150 characters'),
  state: z.string().trim().min(2, 'State / Union Territory is required').max(100, 'State cannot exceed 100 characters'),
  designation: z.string().trim().min(2, 'Designation / Officer role is required').max(100, 'Designation cannot exceed 100 characters'),
  reason: z.string().trim().min(5, 'Reason for access must be at least 5 characters').max(2000, 'Reason cannot exceed 2000 characters'),
  department_id: z.string().uuid('Invalid department ID').optional().nullable().or(z.literal('')),
  department_code: z.string().trim().max(50, 'Department code cannot exceed 50 characters').optional().nullable().or(z.literal('')),
  official_website: z.string().trim().url('Official website must be a valid URL').max(255).optional().nullable().or(z.literal('')),
  supporting_document_url: z.string().trim().url('Supporting document must be a valid URL').max(1000).optional().nullable().or(z.literal('')),
  employment_type: z.string().trim().max(50).optional().nullable().or(z.literal('')),
  organization: z.string().trim().max(150).optional().nullable().or(z.literal('')),
  turnstileToken: z.string().trim().max(2048).optional().nullable().or(z.literal('')),
  requested_role: z.enum(['GOVERNMENT'], {
    errorMap: () => ({ message: 'Public government access portal only accepts GOVERNMENT role requests.' })
  }).optional().default('GOVERNMENT'),
  request_source: z.string().optional()
}).strict();

export const createEvaluatorSelfApplicationSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Professional email address is required').max(255, 'Email cannot exceed 255 characters'),
  phone: z.string().trim().max(25, 'Phone cannot exceed 25 characters').refine(val => !val || phoneRegex.test(val), { message: 'Invalid phone number format' }).optional().nullable().or(z.literal('')),
  organization: z.string().trim().max(150, 'Organization cannot exceed 150 characters').optional().nullable().or(z.literal('')),
  designation: z.string().trim().max(100, 'Designation cannot exceed 100 characters').optional().nullable().or(z.literal('')),
  employment_type: z.enum(['EMPLOYED', 'INDEPENDENT'], {
    errorMap: () => ({ message: 'Employment type must be either EMPLOYED or INDEPENDENT' })
  }).optional().default('INDEPENDENT'),
  domain_expertise: z.union([
    z.array(z.string().trim().min(1).max(100)).max(20, 'Maximum 20 domain expertise tags allowed'),
    z.string().trim().max(500, 'Domain expertise cannot exceed 500 characters')
  ]).optional(),
  years_experience: z.coerce.number({ invalid_type_error: 'Years of experience must be a number' })
    .min(0, 'Years of experience cannot be negative')
    .max(70, 'Years of experience must be 70 or less')
    .optional().default(0),
  bio: z.string().trim().max(2000, 'Bio cannot exceed 2000 characters').optional().nullable().or(z.literal('')),
  reason: z.string().trim().min(5, 'Reason for joining must be at least 5 characters').max(2000, 'Reason cannot exceed 2000 characters'),
  supporting_document_url: z.string().trim().url('Supporting credentials must be a valid URL').max(1000).optional().nullable().or(z.literal('')),
  turnstileToken: z.string().trim().max(2048).optional().nullable().or(z.literal('')),
  requested_role: z.enum(['EVALUATOR'], {
    errorMap: () => ({ message: 'Evaluator application only accepts EVALUATOR role requests.' })
  }).optional().default('EVALUATOR'),
  request_source: z.string().optional()
}).strict();

export const createGovernmentNominationSchema = z.object({
  name: z.string().trim().min(2, 'Evaluator name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Professional email address is required').max(255, 'Email cannot exceed 255 characters'),
  phone: z.string().trim().max(25, 'Phone cannot exceed 25 characters').refine(val => !val || phoneRegex.test(val), { message: 'Invalid phone number format' }).optional().nullable().or(z.literal('')),
  organization: z.string().trim().max(150, 'Organization cannot exceed 150 characters').optional().nullable().or(z.literal('')),
  designation: z.string().trim().max(100, 'Designation cannot exceed 100 characters').optional().nullable().or(z.literal('')),
  employment_type: z.enum(['EMPLOYED', 'INDEPENDENT']).optional().default('EMPLOYED'),
  domain_expertise: z.union([
    z.array(z.string().trim().min(1).max(100)).max(20),
    z.string().trim().max(500)
  ]).optional(),
  years_experience: z.coerce.number({ invalid_type_error: 'Years of experience must be a number' })
    .min(0, 'Years of experience cannot be negative')
    .max(70, 'Years of experience must be 70 or less')
    .optional().default(0),
  bio: z.string().trim().max(2000, 'Bio cannot exceed 2000 characters').optional().nullable().or(z.literal('')),
  reason: z.string().trim().min(5, 'Reason for nomination must be at least 5 characters').max(2000, 'Reason cannot exceed 2000 characters'),
  supporting_document_url: z.string().trim().url('Supporting document must be a valid URL').max(1000).optional().nullable().or(z.literal('')),
  challenge_id: z.string().uuid('Invalid challenge ID').optional().nullable().or(z.literal(''))
}).strict();

export const approveAccessRequestSchema = z.object({
  department_id: z.string().uuid('Invalid department ID').optional().nullable().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().nullable().or(z.literal(''))
}).strict();

export const rejectAccessRequestSchema = z.object({
  rejection_reason: z.string().trim()
    .min(3, 'A specific rejection reason of at least 3 characters is required')
    .max(1000, 'Rejection reason cannot exceed 1000 characters')
}).strict();

export default {
  createGovernmentAccessRequestSchema,
  createEvaluatorSelfApplicationSchema,
  createGovernmentNominationSchema,
  approveAccessRequestSchema,
  rejectAccessRequestSchema
};

