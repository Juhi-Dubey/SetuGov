import { z } from 'zod';

export const createChallengeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  problem_description: z.string().min(20, 'Problem description must be at least 20 characters'),
  current_baseline: z.string().min(5, 'Current baseline is required'),
  desired_outcome: z.string().min(5, 'Desired outcome is required'),
  location: z.string().min(2, 'Location is required'),
  budget_min: z.number().nonnegative('Budget min must be non-negative'),
  budget_max: z.number().positive('Budget max must be positive'),
  pilot_duration_days: z.number().int().positive('Pilot duration must be positive days'),
  required_technologies: z.array(z.string()).min(1, 'At least one required technology must be specified'),
  application_deadline: z.string().datetime({ offset: true }).or(z.string()).nullable().optional(),
  data_classification: z.string().optional(),
  data_access_requirements: z.string().nullable().optional(),
  data_retention_period: z.string().nullable().optional(),
  ip_ownership: z.string().optional(),
  licensing_terms: z.string().nullable().optional(),
  confidentiality_terms: z.string().nullable().optional(),
  current_process: z.string().nullable().optional(),
  pilot_location: z.string().nullable().optional(),
  pilot_start_date: z.string().datetime({ offset: true }).or(z.string()).nullable().optional(),
  pilot_end_date: z.string().datetime({ offset: true }).or(z.string()).nullable().optional(),
  startup_requirements: z.string().nullable().optional(),
  kpis: z.array(z.any()).nullable().optional(),
  milestones: z.array(z.any()).nullable().optional(),
  eligibility_requirements: z.array(z.any()).nullable().optional(),
  required_documents: z.array(z.any()).nullable().optional(),
  cybersecurity_requirements: z.string().nullable().optional(),
  data_compliance: z.string().nullable().optional(),
  department_id: z.string().uuid().optional()
}).refine(data => data.budget_max >= data.budget_min, {
  message: 'Budget max must be greater than or equal to budget min',
  path: ['budget_max']
}).refine(data => {
  if (!data.application_deadline) return true; // Nullable/optional deadlines are allowed
  const deadline = new Date(data.application_deadline);
  return !isNaN(deadline.getTime()) && deadline > new Date();
}, {
  message: 'Application deadline must be a future date. Challenges with expired deadlines cannot be created.',
  path: ['application_deadline']
});

export const updateChallengeSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  problem_description: z.string().min(20).optional(),
  current_baseline: z.string().min(5).optional(),
  desired_outcome: z.string().min(5).optional(),
  location: z.string().min(2).optional(),
  budget_min: z.number().nonnegative().optional(),
  budget_max: z.number().positive().optional(),
  pilot_duration_days: z.number().int().positive().optional(),
  required_technologies: z.array(z.string()).optional(),
  application_deadline: z.string().datetime({ offset: true }).or(z.string()).nullable().optional(),
  data_classification: z.string().optional(),
  data_access_requirements: z.string().nullable().optional(),
  data_retention_period: z.string().nullable().optional(),
  ip_ownership: z.string().optional(),
  licensing_terms: z.string().nullable().optional(),
  confidentiality_terms: z.string().nullable().optional(),
  current_process: z.string().nullable().optional(),
  pilot_location: z.string().nullable().optional(),
  pilot_start_date: z.string().datetime({ offset: true }).or(z.string()).nullable().optional(),
  pilot_end_date: z.string().datetime({ offset: true }).or(z.string()).nullable().optional(),
  startup_requirements: z.string().nullable().optional(),
  kpis: z.array(z.any()).nullable().optional(),
  milestones: z.array(z.any()).nullable().optional(),
  eligibility_requirements: z.array(z.any()).nullable().optional(),
  required_documents: z.array(z.any()).nullable().optional(),
  cybersecurity_requirements: z.string().nullable().optional(),
  data_compliance: z.string().nullable().optional()
});

export const saveChallengeEligibilitySchema = z.object({
  checks: z.array(z.object({
    id: z.string(),
    title: z.string().optional(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    status: z.string().min(1, 'Status is required'),
    required: z.boolean().optional()
  })).min(1, 'At least one eligibility check item is required'),
  decision: z.string().optional(),
  remarks: z.string().nullable().optional()
});

export default {
  createChallengeSchema,
  updateChallengeSchema,
  saveChallengeEligibilitySchema
};
