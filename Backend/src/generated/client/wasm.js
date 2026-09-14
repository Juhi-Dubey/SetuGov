
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.4.1
 * Query Engine version: a9055b89e58b4b5bfb59600785423b1db3d0e75d
 */
Prisma.prismaVersion = {
  client: "6.4.1",
  engine: "a9055b89e58b4b5bfb59600785423b1db3d0e75d"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password_hash: 'password_hash',
  role: 'role',
  department_id: 'department_id',
  is_active: 'is_active',
  is_verified: 'is_verified',
  designation: 'designation',
  phone: 'phone',
  invitation_token_hash: 'invitation_token_hash',
  invitation_expires_at: 'invitation_expires_at',
  invitation_accepted_at: 'invitation_accepted_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  state: 'state',
  contact_email: 'contact_email',
  department_code: 'department_code',
  nodal_officer_name: 'nodal_officer_name',
  nodal_officer_designation: 'nodal_officer_designation',
  nodal_officer_phone: 'nodal_officer_phone',
  official_website: 'official_website',
  verification_status: 'verification_status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ChallengeScalarFieldEnum = {
  id: 'id',
  department_id: 'department_id',
  title: 'title',
  problem_description: 'problem_description',
  current_baseline: 'current_baseline',
  desired_outcome: 'desired_outcome',
  location: 'location',
  budget_min: 'budget_min',
  budget_max: 'budget_max',
  pilot_duration_days: 'pilot_duration_days',
  required_technologies: 'required_technologies',
  application_deadline: 'application_deadline',
  finalist_submission_start: 'finalist_submission_start',
  finalist_submission_deadline: 'finalist_submission_deadline',
  status: 'status',
  created_by: 'created_by',
  data_classification: 'data_classification',
  data_access_requirements: 'data_access_requirements',
  data_retention_period: 'data_retention_period',
  ip_ownership: 'ip_ownership',
  licensing_terms: 'licensing_terms',
  confidentiality_terms: 'confidentiality_terms',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.MatchScoreScalarFieldEnum = {
  id: 'id',
  challenge_id: 'challenge_id',
  startup_id: 'startup_id',
  technology_score: 'technology_score',
  domain_score: 'domain_score',
  readiness_score: 'readiness_score',
  experience_score: 'experience_score',
  deployment_score: 'deployment_score',
  overall_score: 'overall_score',
  ai_reasoning: 'ai_reasoning',
  created_at: 'created_at'
};

exports.Prisma.StartupScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  company_name: 'company_name',
  description: 'description',
  domain: 'domain',
  technologies: 'technologies',
  readiness_level: 'readiness_level',
  years_experience: 'years_experience',
  previous_deployments: 'previous_deployments',
  verification_status: 'verification_status',
  dpiit_number: 'dpiit_number',
  certificate_number: 'certificate_number',
  incorporation_date: 'incorporation_date',
  cin_number: 'cin_number',
  gstin: 'gstin',
  verification_notes: 'verification_notes',
  verified_at: 'verified_at',
  verified_by: 'verified_by',
  location: 'location',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.StartupDocumentScalarFieldEnum = {
  id: 'id',
  startup_id: 'startup_id',
  document_type: 'document_type',
  document_url: 'document_url',
  verification_status: 'verification_status',
  verified_by: 'verified_by',
  verified_at: 'verified_at',
  created_at: 'created_at'
};

exports.Prisma.ApplicationScalarFieldEnum = {
  id: 'id',
  challenge_id: 'challenge_id',
  startup_id: 'startup_id',
  proposal: 'proposal',
  technical_approach: 'technical_approach',
  expected_impact: 'expected_impact',
  estimated_cost: 'estimated_cost',
  timeline: 'timeline',
  status: 'status',
  submitted_at: 'submitted_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.EvaluatorProfileScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  organization: 'organization',
  designation: 'designation',
  employment_type: 'employment_type',
  domain_expertise: 'domain_expertise',
  years_experience: 'years_experience',
  bio: 'bio',
  verification_status: 'verification_status',
  verified_by: 'verified_by',
  verified_at: 'verified_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ConflictDeclarationScalarFieldEnum = {
  id: 'id',
  application_id: 'application_id',
  evaluator_id: 'evaluator_id',
  has_conflict: 'has_conflict',
  conflict_details: 'conflict_details',
  is_recused: 'is_recused',
  declared_at: 'declared_at',
  created_at: 'created_at'
};

exports.Prisma.EvaluationScalarFieldEnum = {
  id: 'id',
  application_id: 'application_id',
  evaluator_id: 'evaluator_id',
  technical_score: 'technical_score',
  innovation_score: 'innovation_score',
  impact_score: 'impact_score',
  scalability_score: 'scalability_score',
  cost_score: 'cost_score',
  total_score: 'total_score',
  comments: 'comments',
  is_submitted: 'is_submitted',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ApplicationDocumentScalarFieldEnum = {
  id: 'id',
  application_id: 'application_id',
  uploaded_by: 'uploaded_by',
  original_filename: 'original_filename',
  stored_filename: 'stored_filename',
  file_url: 'file_url',
  file_size: 'file_size',
  mime_type: 'mime_type',
  document_type: 'document_type',
  description: 'description',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ApplicationProposalAnalysisScalarFieldEnum = {
  id: 'id',
  application_id: 'application_id',
  model_name: 'model_name',
  executive_summary: 'executive_summary',
  technical_feasibility: 'technical_feasibility',
  innovation: 'innovation',
  expected_impact: 'expected_impact',
  scalability: 'scalability',
  cost_effectiveness: 'cost_effectiveness',
  strengths: 'strengths',
  weaknesses: 'weaknesses',
  risks: 'risks',
  missing_information: 'missing_information',
  evaluator_questions: 'evaluator_questions',
  raw_analysis: 'raw_analysis',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.EvaluatorMatchScoreScalarFieldEnum = {
  id: 'id',
  challenge_id: 'challenge_id',
  evaluator_id: 'evaluator_id',
  overall_score: 'overall_score',
  domain_score: 'domain_score',
  experience_score: 'experience_score',
  tech_score: 'tech_score',
  capability_score: 'capability_score',
  eligibility_state: 'eligibility_state',
  eligibility_reasons: 'eligibility_reasons',
  breakdown: 'breakdown',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.EvaluatorApplicationScalarFieldEnum = {
  id: 'id',
  challenge_id: 'challenge_id',
  evaluator_id: 'evaluator_id',
  statement: 'statement',
  status: 'status',
  reviewed_by: 'reviewed_by',
  reviewed_at: 'reviewed_at',
  review_reason: 'review_reason',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ChallengeEvaluatorPoolScalarFieldEnum = {
  id: 'id',
  challenge_id: 'challenge_id',
  evaluator_id: 'evaluator_id',
  source: 'source',
  added_by: 'added_by',
  notes: 'notes',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PilotScalarFieldEnum = {
  id: 'id',
  challenge_id: 'challenge_id',
  startup_id: 'startup_id',
  location: 'location',
  start_date: 'start_date',
  end_date: 'end_date',
  budget: 'budget',
  status: 'status',
  overall_score: 'overall_score',
  final_recommendation: 'final_recommendation',
  data_classification: 'data_classification',
  data_access_requirements: 'data_access_requirements',
  data_retention_period: 'data_retention_period',
  ip_ownership: 'ip_ownership',
  licensing_terms: 'licensing_terms',
  confidentiality_terms: 'confidentiality_terms',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PilotKpiScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  name: 'name',
  description: 'description',
  unit: 'unit',
  baseline_value: 'baseline_value',
  target_value: 'target_value',
  actual_value: 'actual_value',
  weight: 'weight',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PilotMeasurementScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  kpi_id: 'kpi_id',
  measurement_date: 'measurement_date',
  value: 'value',
  source: 'source',
  verified: 'verified',
  created_at: 'created_at'
};

exports.Prisma.MilestoneScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  name: 'name',
  description: 'description',
  due_date: 'due_date',
  status: 'status',
  completion_percentage: 'completion_percentage',
  payment_percentage: 'payment_percentage',
  evidence_url: 'evidence_url',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.EvidenceScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  kpi_id: 'kpi_id',
  type: 'type',
  description: 'description',
  file_url: 'file_url',
  date: 'date',
  source: 'source',
  verification_status: 'verification_status',
  uploaded_by: 'uploaded_by',
  created_at: 'created_at'
};

exports.Prisma.RiskScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  category: 'category',
  description: 'description',
  severity: 'severity',
  probability: 'probability',
  mitigation: 'mitigation',
  owner: 'owner',
  due_date: 'due_date',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PilotIssueScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  title: 'title',
  description: 'description',
  severity: 'severity',
  status: 'status',
  assigned_to: 'assigned_to',
  resolution: 'resolution',
  reported_at: 'reported_at',
  resolved_at: 'resolved_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ValidationScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  validator_id: 'validator_id',
  performance_score: 'performance_score',
  kpi_achievement_score: 'kpi_achievement_score',
  evidence_quality_score: 'evidence_quality_score',
  technical_stability_score: 'technical_stability_score',
  user_satisfaction_score: 'user_satisfaction_score',
  comments: 'comments',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  milestone_id: 'milestone_id',
  procurement_id: 'procurement_id',
  amount: 'amount',
  payment_percentage: 'payment_percentage',
  status: 'status',
  payment_date: 'payment_date',
  invoice_url: 'invoice_url',
  reference_number: 'reference_number',
  approved_by: 'approved_by',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ScaleDecisionScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  decision: 'decision',
  score: 'score',
  reasoning: 'reasoning',
  approved_by: 'approved_by',
  decision_date: 'decision_date',
  status: 'status',
  created_at: 'created_at'
};

exports.Prisma.ComplianceItemScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  category: 'category',
  item_name: 'item_name',
  description: 'description',
  status: 'status',
  verified_by: 'verified_by',
  verified_at: 'verified_at',
  notes: 'notes',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PilotFeedbackScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  citizen_name: 'citizen_name',
  beneficiary_type: 'beneficiary_type',
  rating: 'rating',
  comments: 'comments',
  feedback_date: 'feedback_date',
  created_at: 'created_at'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  title: 'title',
  message: 'message',
  type: 'type',
  is_read: 'is_read',
  link: 'link',
  created_at: 'created_at'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  action: 'action',
  entity_type: 'entity_type',
  entity_id: 'entity_id',
  details: 'details',
  ip_address: 'ip_address',
  created_at: 'created_at'
};

exports.Prisma.AccessRequestScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  requested_role: 'requested_role',
  request_source: 'request_source',
  department_id: 'department_id',
  department_name: 'department_name',
  state: 'state',
  department_code: 'department_code',
  official_website: 'official_website',
  organization: 'organization',
  designation: 'designation',
  employment_type: 'employment_type',
  domain_expertise: 'domain_expertise',
  years_experience: 'years_experience',
  bio: 'bio',
  reason: 'reason',
  supporting_document_url: 'supporting_document_url',
  status: 'status',
  reviewed_by: 'reviewed_by',
  reviewed_at: 'reviewed_at',
  rejection_reason: 'rejection_reason',
  nominated_by_user_id: 'nominated_by_user_id',
  challenge_id: 'challenge_id',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.EvaluatorAssignmentScalarFieldEnum = {
  id: 'id',
  application_id: 'application_id',
  evaluator_id: 'evaluator_id',
  assigned_by: 'assigned_by',
  status: 'status',
  notes: 'notes',
  assigned_at: 'assigned_at',
  accepted_at: 'accepted_at',
  completed_at: 'completed_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ProcurementRecordScalarFieldEnum = {
  id: 'id',
  pilot_id: 'pilot_id',
  challenge_id: 'challenge_id',
  startup_id: 'startup_id',
  department_id: 'department_id',
  status: 'status',
  route: 'route',
  estimated_value: 'estimated_value',
  final_contract_value: 'final_contract_value',
  justification: 'justification',
  technical_readiness: 'technical_readiness',
  compliance_readiness: 'compliance_readiness',
  cybersecurity_clearance: 'cybersecurity_clearance',
  data_protection_clearance: 'data_protection_clearance',
  initiated_by: 'initiated_by',
  approved_by: 'approved_by',
  approved_at: 'approved_at',
  approval_notes: 'approval_notes',
  rejection_reason: 'rejection_reason',
  gem_handoff_status: 'gem_handoff_status',
  gem_handoff_date: 'gem_handoff_date',
  gem_reference_number: 'gem_reference_number',
  gem_officer_name: 'gem_officer_name',
  gem_notes: 'gem_notes',
  gem_supporting_doc: 'gem_supporting_doc',
  po_reference_number: 'po_reference_number',
  contract_reference: 'contract_reference',
  contract_document_url: 'contract_document_url',
  contract_issued_at: 'contract_issued_at',
  contract_effective_date: 'contract_effective_date',
  contract_duration_days: 'contract_duration_days',
  delivery_date: 'delivery_date',
  delivery_scope: 'delivery_scope',
  delivery_evidence_url: 'delivery_evidence_url',
  delivery_notes: 'delivery_notes',
  acceptance_status: 'acceptance_status',
  accepted_by: 'accepted_by',
  accepted_at: 'accepted_at',
  acceptance_remarks: 'acceptance_remarks',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SystemSettingScalarFieldEnum = {
  id: 'id',
  key: 'key',
  value: 'value',
  updated_by: 'updated_by',
  updated_at: 'updated_at',
  created_at: 'created_at'
};

exports.Prisma.EvaluationCriterionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  weight: 'weight',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SystemTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  description: 'description',
  fields_count: 'fields_count',
  status: 'status',
  schema_definition: 'schema_definition',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  GOVERNMENT: 'GOVERNMENT',
  STARTUP: 'STARTUP',
  EVALUATOR: 'EVALUATOR',
  ADMIN: 'ADMIN'
};

exports.StartupVerificationStatus = exports.$Enums.StartupVerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.ChallengeStatus = exports.$Enums.ChallengeStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  EVALUATION: 'EVALUATION',
  PILOT: 'PILOT',
  COMPLETED: 'COMPLETED'
};

exports.ApplicationStatus = exports.$Enums.ApplicationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  SHORTLISTED: 'SHORTLISTED',
  REJECTED: 'REJECTED',
  SELECTED: 'SELECTED'
};

exports.PilotStatus = exports.$Enums.PilotStatus = {
  PLANNED: 'PLANNED',
  RUNNING: 'RUNNING',
  AT_RISK: 'AT_RISK',
  VALIDATION: 'VALIDATION',
  COMPLETED: 'COMPLETED',
  SCALED: 'SCALED',
  EXTENDED: 'EXTENDED',
  STOPPED: 'STOPPED'
};

exports.RiskCategory = exports.$Enums.RiskCategory = {
  TECHNICAL: 'TECHNICAL',
  CYBERSECURITY: 'CYBERSECURITY',
  DATA: 'DATA',
  PERFORMANCE: 'PERFORMANCE',
  OPERATIONAL: 'OPERATIONAL',
  FINANCIAL: 'FINANCIAL'
};

exports.ValidationStatus = exports.$Enums.ValidationStatus = {
  VALIDATED: 'VALIDATED',
  VALIDATED_WITH_CONDITIONS: 'VALIDATED_WITH_CONDITIONS',
  NOT_VALIDATED: 'NOT_VALIDATED'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  UPCOMING: 'UPCOMING',
  PENDING: 'PENDING',
  PAID: 'PAID',
  REJECTED: 'REJECTED'
};

exports.ScaleDecisionType = exports.$Enums.ScaleDecisionType = {
  SCALE: 'SCALE',
  EXTEND: 'EXTEND',
  STOP: 'STOP'
};

exports.AccessRequestSource = exports.$Enums.AccessRequestSource = {
  SELF_REQUEST: 'SELF_REQUEST',
  GOVERNMENT_NOMINATION: 'GOVERNMENT_NOMINATION'
};

exports.AccessRequestStatus = exports.$Enums.AccessRequestStatus = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.EvaluatorAssignmentStatus = exports.$Enums.EvaluatorAssignmentStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  COMPLETED: 'COMPLETED',
  RECUSED: 'RECUSED'
};

exports.ProcurementStatus = exports.$Enums.ProcurementStatus = {
  DRAFT: 'DRAFT',
  READINESS_CHECK: 'READINESS_CHECK',
  APPROVED: 'APPROVED',
  HANDED_OFF: 'HANDED_OFF',
  CONTRACT_ISSUED: 'CONTRACT_ISSUED',
  DELIVERY_SUBMITTED: 'DELIVERY_SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED'
};

exports.ProcurementRoute = exports.$Enums.ProcurementRoute = {
  GEM: 'GEM',
  OTHER_APPROVED_ROUTE: 'OTHER_APPROVED_ROUTE',
  DIRECT_APPROVED_ROUTE: 'DIRECT_APPROVED_ROUTE',
  OFFLINE_HANDOFF: 'OFFLINE_HANDOFF'
};

exports.GeMHandoffStatus = exports.$Enums.GeMHandoffStatus = {
  NOT_STARTED: 'NOT_STARTED',
  READY: 'READY',
  HANDED_OFF: 'HANDED_OFF',
  EXTERNAL_PROCESSING: 'EXTERNAL_PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED_RETURNED: 'FAILED_RETURNED'
};

exports.AcceptanceStatus = exports.$Enums.AcceptanceStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CONDITIONAL_ACCEPTANCE: 'CONDITIONAL_ACCEPTANCE'
};

exports.Prisma.ModelName = {
  User: 'User',
  Department: 'Department',
  Challenge: 'Challenge',
  MatchScore: 'MatchScore',
  Startup: 'Startup',
  StartupDocument: 'StartupDocument',
  Application: 'Application',
  EvaluatorProfile: 'EvaluatorProfile',
  ConflictDeclaration: 'ConflictDeclaration',
  Evaluation: 'Evaluation',
  ApplicationDocument: 'ApplicationDocument',
  ApplicationProposalAnalysis: 'ApplicationProposalAnalysis',
  EvaluatorMatchScore: 'EvaluatorMatchScore',
  EvaluatorApplication: 'EvaluatorApplication',
  ChallengeEvaluatorPool: 'ChallengeEvaluatorPool',
  Pilot: 'Pilot',
  PilotKpi: 'PilotKpi',
  PilotMeasurement: 'PilotMeasurement',
  Milestone: 'Milestone',
  Evidence: 'Evidence',
  Risk: 'Risk',
  PilotIssue: 'PilotIssue',
  Validation: 'Validation',
  Payment: 'Payment',
  ScaleDecision: 'ScaleDecision',
  ComplianceItem: 'ComplianceItem',
  PilotFeedback: 'PilotFeedback',
  Notification: 'Notification',
  AuditLog: 'AuditLog',
  AccessRequest: 'AccessRequest',
  EvaluatorAssignment: 'EvaluatorAssignment',
  ProcurementRecord: 'ProcurementRecord',
  SystemSetting: 'SystemSetting',
  EvaluationCriterion: 'EvaluationCriterion',
  SystemTemplate: 'SystemTemplate'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
