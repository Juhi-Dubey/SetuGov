import { z } from 'zod';
import { PATTERNS } from '../services/verificationService.js';

export const orgTypeEnum = z.enum([
  'PROPRIETORSHIP',
  'PARTNERSHIP',
  'LLP',
  'PRIVATE_LIMITED',
  'PUBLIC_LIMITED',
  'TRUST',
  'SOCIETY',
  'ASSOCIATION',
  'OTHER'
]);

export const verificationStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'CORRECTION_REQUESTED',
  'PENDING'
]);

export const createStartupSchema = z.object({
  company_name: z.string().min(2, 'Company legal name must be at least 2 characters').max(150),
  org_type: orgTypeEnum.optional().default('PRIVATE_LIMITED'),
  registered_address: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().regex(PATTERNS.PINCODE, 'Invalid 6-digit PIN code').optional().nullable().or(z.literal('')),
  official_email: z.string().email('Invalid official email address').optional().nullable(),
  official_website: z.string().url('Invalid website URL').optional().nullable(),
  authorized_person_name: z.string().optional().nullable(),
  authorized_person_designation: z.string().optional().nullable(),
  authorized_person_email: z.string().email('Invalid email').optional().nullable(),
  authorized_person_phone: z.string().optional().nullable(),
  authorization_type: z.string().optional().nullable(),
  pan_number: z.string().regex(PATTERNS.PAN, 'Invalid PAN format (e.g. ABCDE1234F)').optional().nullable(),
  cin_number: z.string().optional().nullable(),
  gstin: z.string().regex(PATTERNS.GSTIN, 'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)').optional().nullable(),
  dpiit_number: z.string().optional().nullable(),
  certificate_number: z.string().optional().nullable(),
  incorporation_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional().default('Startup profile pending onboarding completion.'),
  domain: z.string().min(2, 'Domain is required').optional().default('Technology'),
  technologies: z.array(z.string()).max(50, 'Cannot exceed 50 technologies').optional().default([]),
  products_services: z.string().optional().nullable(),
  readiness_level: z.number().int().min(1).max(9).default(1),
  years_experience: z.number().int().min(0).default(0),
  previous_deployments: z.number().int().min(0).default(0),
  location: z.string().min(2, 'Location is required').optional().default('India')
});

export const updateStartupSchema = z.object({
  company_name: z.string().min(2).max(150).optional(),
  org_type: orgTypeEnum.optional(),
  registered_address: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().regex(PATTERNS.PINCODE, 'Postal PIN code must be exactly 6 digits (e.g. 560001)').optional().nullable().or(z.literal('')),
  official_email: z.string().email().optional().nullable().or(z.literal('')),
  official_website: z.string().optional().nullable().or(z.literal('')),
  authorized_person_name: z.string().optional().nullable(),
  authorized_person_designation: z.string().optional().nullable(),
  authorized_person_email: z.string().email().optional().nullable().or(z.literal('')),
  authorized_person_phone: z.string().optional().nullable(),
  authorization_type: z.string().optional().nullable(),
  pan_number: z.string().optional().nullable().or(z.literal('')),
  cin_number: z.string().optional().nullable().or(z.literal('')),
  gstin: z.string().optional().nullable().or(z.literal('')),
  dpiit_number: z.string().optional().nullable().or(z.literal('')),
  certificate_number: z.string().optional().nullable(),
  incorporation_date: z.string().optional().nullable(),
  description: z.string().optional(),
  domain: z.string().optional(),
  technologies: z.array(z.string()).max(50, 'Cannot exceed 50 technologies').optional(),
  products_services: z.string().optional().nullable(),
  readiness_level: z.number().int().min(1).max(9).optional(),
  years_experience: z.number().int().min(0).optional(),
  previous_deployments: z.number().int().min(0).optional(),
  location: z.string().optional()
}).strict();

export const bankDetailsSchema = z.object({
  account_holder_name: z.string().min(2, 'Account holder legal name is required'),
  bank_name: z.string().min(2, 'Bank name is required'),
  account_number: z.string().regex(/^(\d{9,18}|[•*]{4,}\d{4})$/, 'Account number must be 9 to 18 digits or preserved masked value'),
  ifsc_code: z.string().regex(PATTERNS.IFSC, 'Invalid IFSC code (e.g. SBIN0001234)'),
  branch_name: z.string().optional().nullable(),
  account_type: z.enum(['CURRENT', 'SAVINGS', 'ESCROW']).optional().default('CURRENT')
});

export const addDocumentSchema = z.object({
  document_type: z.string().min(2, 'Document type is required (e.g. INCORPORATION_CERTIFICATE, PAN, GST_CERTIFICATE, DPIIT_CERTIFICATE, BANK_PROOF, AUTHORIZED_PERSON_PROOF)'),
  document_url: z.string().min(5, 'Document URL / file path is required'),
  file_name: z.string().optional().nullable(),
  file_size: z.number().int().optional().nullable(),
  mime_type: z.string().optional().nullable()
});

export const submitStartupRegistrationSchema = z.object({
  declaration_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the truthfulness declaration before submitting for verification.'
  })
});

export const adminVerifyStartupSchema = z.object({
  action: z.enum(['START_REVIEW', 'APPROVE', 'REJECT', 'REQUEST_CORRECTION'], {
    errorMap: () => ({ message: 'Action must be START_REVIEW, APPROVE, REJECT, or REQUEST_CORRECTION' })
  }),
  notes: z.string().optional().nullable(),
  rejection_reason: z.string().optional().nullable(),
  correction_notes: z.string().optional().nullable()
});

export const verifyStartupDocumentSchema = z.object({
  verification_status: z.enum(['VERIFIED', 'REJECTED', 'PENDING'], {
    errorMap: () => ({ message: 'Status must be VERIFIED, REJECTED, or PENDING' })
  }),
  rejection_reason: z.string().optional().nullable()
});

export const verifyStartupSchema = z.object({
  verification_status: z.enum(['VERIFIED', 'REJECTED', 'PENDING', 'UNDER_REVIEW', 'DRAFT', 'CORRECTION_REQUESTED']),
  comments: z.string().optional()
});

export default {
  orgTypeEnum,
  verificationStatusEnum,
  createStartupSchema,
  updateStartupSchema,
  bankDetailsSchema,
  addDocumentSchema,
  submitStartupRegistrationSchema,
  adminVerifyStartupSchema,
  verifyStartupDocumentSchema,
  verifyStartupSchema
};
