import { z } from 'zod';

/**
 * KPI Input Schema — matches AI service KPIInput model
 */
export const kpiInputSchema = z.object({
  name: z.string().min(1, 'KPI name is required'),
  description: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  baseline: z.number().optional().nullable(),
  target: z.number().optional().nullable(),
  direction: z.string().optional().nullable(),
  measurement_method: z.string().optional().nullable(),
  weight: z.number().optional().nullable()
});

/**
 * Brain 1 — Challenge Copilot Request Schema
 * Mirrors AI service ChallengeCopilotRequest (schemas/requests.py)
 */
export const challengeCopilotSchema = z.object({
  problem: z.object({
    title: z.string().min(5, 'Problem title must be at least 5 characters'),
    description: z.string().min(20, 'Problem description must be at least 20 characters'),
    current_process: z.string().optional().nullable(),
    baseline: z.string().optional().nullable(),
    location: z.string().optional().nullable()
  }),
  outcome: z.object({
    desired_outcome: z.string().optional().nullable(),
    success_definition: z.string().optional().nullable()
  }).optional().nullable(),
  measurement: z.object({
    kpis: z.array(kpiInputSchema).default([])
  }).optional().nullable(),
  pilot: z.object({
    duration: z.string().optional().nullable(),
    sites: z.array(z.string()).optional().nullable(),
    budget: z.string().optional().nullable()
  }).optional().nullable(),
  requirements: z.object({
    technologies: z.array(z.string()).optional().nullable(),
    domain: z.string().optional().nullable(),
    eligibility: z.array(z.string()).optional().nullable(),
    documents: z.array(z.string()).optional().nullable()
  }).optional().nullable()
});

/**
 * Brain 2 — Match Explanation Request Schema
 * Mirrors AI service MatchExplanationRequest (schemas/requests.py)
 */
export const matchExplanationSchema = z.object({
  challenge: z.object({
    title: z.string().min(1, 'Challenge title is required'),
    description: z.string().min(1, 'Challenge description is required'),
    domain: z.string().optional().nullable(),
    technology_categories: z.array(z.string()).optional().nullable(),
    location: z.string().optional().nullable(),
    kpis: z.array(kpiInputSchema).default([])
  }),
  startup: z.object({
    name: z.string().min(1, 'Startup name is required'),
    description: z.string().min(1, 'Startup description is required'),
    technologies: z.array(z.string()).optional().nullable(),
    domain: z.string().optional().nullable(),
    experience: z.string().optional().nullable(),
    deployments: z.array(z.string()).optional().nullable(),
    certifications: z.array(z.string()).optional().nullable(),
    team_size: z.number().int().optional().nullable(),
    location: z.string().optional().nullable()
  })
});

/**
 * Brain 3 — Proposal Content Schema
 * Mirrors AI service ProposalContent (schemas/requests.py)
 */
export const proposalContentSchema = z.object({
  summary: z.string().optional().nullable(),
  technical_approach: z.string().optional().nullable(),
  implementation_timeline: z.string().optional().nullable(),
  estimated_cost: z.string().optional().nullable(),
  expected_impact: z.string().optional().nullable(),
  team_composition: z.string().optional().nullable(),
  past_experience: z.string().optional().nullable()
});

/**
 * Brain 3 — Eligibility Info Schema
 * Mirrors AI service EligibilityInfo (schemas/requests.py)
 */
export const eligibilityInfoSchema = z.object({
  dpiit_registered: z.boolean().optional().nullable(),
  incorporation_date: z.string().optional().nullable(),
  annual_turnover: z.string().optional().nullable(),
  certifications: z.array(z.string()).optional().nullable(),
  additional_documents: z.array(z.string()).optional().nullable()
});

/**
 * Brain 3 — Proposal Analysis Request Schema
 * Mirrors AI service ProposalAnalysisRequest (schemas/requests.py)
 */
export const proposalAnalysisSchema = z.object({
  challenge: z.object({
    title: z.string().min(1, 'Challenge title is required'),
    description: z.string().min(1, 'Challenge description is required'),
    domain: z.string().optional().nullable(),
    technology_categories: z.array(z.string()).optional().nullable(),
    location: z.string().optional().nullable(),
    kpis: z.array(kpiInputSchema).default([])
  }),
  startup: z.object({
    name: z.string().min(1, 'Startup name is required'),
    description: z.string().min(1, 'Startup description is required'),
    technologies: z.array(z.string()).optional().nullable(),
    domain: z.string().optional().nullable(),
    experience: z.string().optional().nullable(),
    deployments: z.array(z.string()).optional().nullable(),
    certifications: z.array(z.string()).optional().nullable(),
    team_size: z.number().int().optional().nullable(),
    location: z.string().optional().nullable()
  }),
  proposal: proposalContentSchema,
  eligibility: eligibilityInfoSchema.optional().nullable(),
  available_documents: z.array(z.string()).optional().nullable()
});

/**
 * Brain 4 — KPI Result Schema
 * Mirrors AI service KPIResult (schemas/requests.py)
 */
export const kpiResultSchema = z.object({
  name: z.string().min(1, 'KPI name is required'),
  unit: z.string().optional().nullable(),
  baseline: z.number().optional().nullable(),
  target: z.number().optional().nullable(),
  actual: z.number().optional().nullable(),
  direction: z.string().optional().nullable()
});

/**
 * Brain 4 — Milestone Result Schema
 * Mirrors AI service MilestoneResult (schemas/requests.py)
 */
export const milestoneResultSchema = z.object({
  name: z.string().min(1, 'Milestone name is required'),
  expected_date: z.string().optional().nullable(),
  actual_date: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

/**
 * Brain 4 — Pilot Risk Schema
 * Mirrors AI service PilotRisk (schemas/requests.py)
 */
export const pilotRiskSchema = z.object({
  category: z.string().min(1, 'Risk category is required'),
  description: z.string().min(1, 'Risk description is required'),
  severity: z.string().optional().nullable(),
  mitigation: z.string().optional().nullable()
});

/**
 * Brain 4 — Pilot Evidence Schema
 * Mirrors AI service PilotEvidence (schemas/requests.py)
 */
export const pilotEvidenceSchema = z.object({
  description: z.string().min(1, 'Evidence description is required'),
  source: z.string().optional().nullable(),
  verified: z.boolean().optional().nullable()
});

/**
 * Brain 4 — Pilot Intelligence Request Schema
 * Mirrors AI service PilotIntelligenceRequest (schemas/requests.py)
 */
export const pilotIntelligenceSchema = z.object({
  challenge_title: z.string().min(1, 'Challenge title is required'),
  startup_name: z.string().min(1, 'Startup name is required'),
  pilot_duration: z.string().optional().nullable(),
  pilot_sites: z.array(z.string()).optional().nullable(),
  kpi_results: z.array(kpiResultSchema).default([]),
  milestones: z.array(milestoneResultSchema).default([]),
  risks: z.array(pilotRiskSchema).default([]),
  evidence: z.array(pilotEvidenceSchema).default([]),
  user_feedback: z.string().optional().nullable(),
  technical_stability: z.string().optional().nullable(),
  independent_validation: z.string().optional().nullable()
});

/**
 * Brain 5 — Document Types Enum
 * Mirrors AI service DocumentType enum (schemas/requests.py)
 */
export const documentTypeEnum = z.enum([
  'CHALLENGE_STATEMENT',
  'EVALUATION_CRITERIA',
  'PILOT_AGREEMENT_DRAFT',
  'GOVERNANCE_CHECKLIST',
  'PROCUREMENT_PATHWAY_SUMMARY'
], {
  errorMap: () => ({
    message: 'document_type must be one of: CHALLENGE_STATEMENT, EVALUATION_CRITERIA, PILOT_AGREEMENT_DRAFT, GOVERNANCE_CHECKLIST, PROCUREMENT_PATHWAY_SUMMARY'
  })
});

/**
 * Brain 5 — Document Assistance Request Schema
 * Mirrors AI service DocumentAssistanceRequest (schemas/requests.py)
 */
export const documentAssistanceSchema = z.object({
  document_type: documentTypeEnum,
  challenge_title: z.string().optional().nullable(),
  challenge_description: z.string().optional().nullable(),
  startup_name: z.string().optional().nullable(),
  pilot_duration: z.string().optional().nullable(),
  pilot_sites: z.array(z.string()).optional().nullable(),
  pilot_budget: z.string().optional().nullable(),
  kpis: z.array(kpiInputSchema).optional().nullable(),
  objectives: z.array(z.string()).optional().nullable(),
  additional_context: z.string().optional().nullable()
});

export default {
  kpiInputSchema,
  challengeCopilotSchema,
  matchExplanationSchema,
  proposalContentSchema,
  eligibilityInfoSchema,
  proposalAnalysisSchema,
  kpiResultSchema,
  milestoneResultSchema,
  pilotRiskSchema,
  pilotEvidenceSchema,
  pilotIntelligenceSchema,
  documentTypeEnum,
  documentAssistanceSchema
};


