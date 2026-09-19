-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GOVERNMENT', 'STARTUP', 'EVALUATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'EVALUATION', 'PILOT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StartupVerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'CORRECTION_REQUESTED', 'PENDING');

-- CreateEnum
CREATE TYPE "StartupOrgType" AS ENUM ('PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'TRUST', 'SOCIETY', 'ASSOCIATION', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationSource" AS ENUM ('SELF_DECLARED', 'DOCUMENT_VERIFIED', 'EXTERNAL_API_VERIFIED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SHORTLISTED', 'REJECTED', 'SELECTED');

-- CreateEnum
CREATE TYPE "PilotStatus" AS ENUM ('PLANNED', 'RUNNING', 'AT_RISK', 'VALIDATION', 'COMPLETED', 'SCALED', 'EXTENDED', 'STOPPED');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('TECHNICAL', 'CYBERSECURITY', 'DATA', 'PERFORMANCE', 'OPERATIONAL', 'FINANCIAL');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('VALIDATED', 'VALIDATED_WITH_CONDITIONS', 'NOT_VALIDATED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UPCOMING', 'PENDING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScaleDecisionType" AS ENUM ('SCALE', 'EXTEND', 'STOP');

-- CreateEnum
CREATE TYPE "AccessRequestSource" AS ENUM ('SELF_REQUEST', 'GOVERNMENT_NOMINATION');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvaluatorAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'RECUSED');

-- CreateEnum
CREATE TYPE "ProcurementStatus" AS ENUM ('DRAFT', 'READINESS_CHECK', 'APPROVED', 'HANDED_OFF', 'CONTRACT_ISSUED', 'DELIVERY_SUBMITTED', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProcurementRoute" AS ENUM ('GEM', 'OTHER_APPROVED_ROUTE', 'DIRECT_APPROVED_ROUTE', 'OFFLINE_HANDOFF');

-- CreateEnum
CREATE TYPE "GeMHandoffStatus" AS ENUM ('NOT_STARTED', 'READY', 'HANDED_OFF', 'EXTERNAL_PROCESSING', 'COMPLETED', 'FAILED_RETURNED');

-- CreateEnum
CREATE TYPE "AcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CONDITIONAL_ACCEPTANCE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "department_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "designation" TEXT,
    "phone" TEXT,
    "invitation_token_hash" TEXT,
    "invitation_expires_at" TIMESTAMP(3),
    "invitation_accepted_at" TIMESTAMP(3),
    "email_verification_token_hash" TEXT,
    "email_verification_expires_at" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_failed_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "department_code" TEXT,
    "nodal_officer_name" TEXT,
    "nodal_officer_designation" TEXT,
    "nodal_officer_phone" TEXT,
    "official_website" TEXT,
    "verification_status" "StartupVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problem_description" TEXT NOT NULL,
    "current_baseline" TEXT NOT NULL,
    "desired_outcome" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "budget_min" DECIMAL(14,2) NOT NULL,
    "budget_max" DECIMAL(14,2) NOT NULL,
    "pilot_duration_days" INTEGER NOT NULL,
    "required_technologies" TEXT[],
    "application_deadline" TIMESTAMP(3),
    "finalist_submission_start" TIMESTAMP(3),
    "finalist_submission_deadline" TIMESTAMP(3),
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "embedding" vector(768),
    "data_classification" TEXT DEFAULT 'INTERNAL',
    "data_access_requirements" TEXT,
    "data_retention_period" TEXT,
    "ip_ownership" TEXT DEFAULT 'STARTUP_OWNED',
    "licensing_terms" TEXT,
    "confidentiality_terms" TEXT,
    "current_process" TEXT,
    "pilot_location" TEXT,
    "pilot_start_date" TIMESTAMP(3),
    "pilot_end_date" TIMESTAMP(3),
    "startup_requirements" TEXT,
    "kpis" JSONB,
    "milestones" JSONB,
    "eligibility_requirements" JSONB,
    "required_documents" JSONB,
    "cybersecurity_requirements" TEXT,
    "data_compliance" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_eligibility_reviews" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "reviewed_by" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "checks" JSONB NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_eligibility_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_scores" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "technology_score" DOUBLE PRECISION NOT NULL,
    "domain_score" DOUBLE PRECISION NOT NULL,
    "readiness_score" DOUBLE PRECISION NOT NULL,
    "experience_score" DOUBLE PRECISION NOT NULL,
    "deployment_score" DOUBLE PRECISION NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "ai_reasoning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "technologies" TEXT[],
    "readiness_level" INTEGER NOT NULL DEFAULT 1,
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "previous_deployments" INTEGER NOT NULL DEFAULT 0,
    "verification_status" "StartupVerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "org_type" "StartupOrgType" NOT NULL DEFAULT 'PRIVATE_LIMITED',
    "registered_address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "official_email" TEXT,
    "official_website" TEXT,
    "authorized_person_name" TEXT,
    "authorized_person_designation" TEXT,
    "authorized_person_email" TEXT,
    "authorized_person_phone" TEXT,
    "authorization_type" TEXT,
    "pan_number" TEXT,
    "cin_number" TEXT,
    "gstin" TEXT,
    "dpiit_number" TEXT,
    "certificate_number" TEXT,
    "registration_number" TEXT,
    "incorporation_date" TIMESTAMP(3),
    "verification_source" "VerificationSource" NOT NULL DEFAULT 'SELF_DECLARED',
    "products_services" TEXT,
    "location" TEXT NOT NULL,
    "verification_notes" TEXT,
    "correction_notes" TEXT,
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "embedding" vector(768),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "startups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_bank_details" (
    "id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "branch_name" TEXT,
    "account_type" TEXT DEFAULT 'CURRENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "startup_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_documents" (
    "id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "verification_status" "StartupVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "startup_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "proposal" TEXT NOT NULL,
    "technical_approach" TEXT NOT NULL,
    "expected_impact" TEXT NOT NULL,
    "estimated_cost" DECIMAL(14,2) NOT NULL,
    "timeline" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluator_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "employment_type" TEXT,
    "domain_expertise" TEXT[],
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "verification_status" "StartupVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflict_declarations" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "has_conflict" BOOLEAN NOT NULL DEFAULT false,
    "conflict_details" TEXT,
    "is_recused" BOOLEAN NOT NULL DEFAULT false,
    "declared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conflict_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "technical_score" DOUBLE PRECISION NOT NULL,
    "innovation_score" DOUBLE PRECISION NOT NULL,
    "impact_score" DOUBLE PRECISION NOT NULL,
    "scalability_score" DOUBLE PRECISION NOT NULL,
    "cost_score" DOUBLE PRECISION NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "is_submitted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "stored_filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "document_type" TEXT NOT NULL DEFAULT 'PROPOSAL_DOC',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_proposal_analyses" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "model_name" TEXT,
    "executive_summary" TEXT NOT NULL,
    "technical_feasibility" TEXT NOT NULL,
    "innovation" TEXT NOT NULL,
    "expected_impact" TEXT NOT NULL,
    "scalability" TEXT NOT NULL,
    "cost_effectiveness" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "risks" TEXT[],
    "missing_information" TEXT[],
    "evaluator_questions" TEXT[],
    "raw_analysis" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_proposal_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluator_match_scores" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "domain_score" DOUBLE PRECISION NOT NULL,
    "experience_score" DOUBLE PRECISION NOT NULL,
    "tech_score" DOUBLE PRECISION NOT NULL,
    "capability_score" DOUBLE PRECISION NOT NULL,
    "eligibility_state" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "eligibility_reasons" TEXT[],
    "breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluator_match_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluator_applications" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "statement" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluator_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_evaluator_pools" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MATCHED',
    "added_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_evaluator_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilots" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "budget" DECIMAL(14,2) NOT NULL,
    "status" "PilotStatus" NOT NULL DEFAULT 'PLANNED',
    "overall_score" DOUBLE PRECISION,
    "final_recommendation" TEXT,
    "data_classification" TEXT DEFAULT 'INTERNAL',
    "data_access_requirements" TEXT,
    "data_retention_period" TEXT,
    "ip_ownership" TEXT DEFAULT 'STARTUP_OWNED',
    "licensing_terms" TEXT,
    "confidentiality_terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_kpis" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "baseline_value" DOUBLE PRECISION NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "actual_value" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_measurements" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "measurement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completion_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidence_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "kpi_id" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "probability" TEXT NOT NULL DEFAULT 'MEDIUM',
    "mitigation" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_issues" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "resolution" TEXT,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_progress_updates" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Startup Progress Update',
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validations" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "validator_id" TEXT NOT NULL,
    "performance_score" DOUBLE PRECISION NOT NULL,
    "kpi_achievement_score" DOUBLE PRECISION NOT NULL,
    "evidence_quality_score" DOUBLE PRECISION NOT NULL,
    "technical_stability_score" DOUBLE PRECISION NOT NULL,
    "user_satisfaction_score" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "status" "ValidationStatus" NOT NULL DEFAULT 'NOT_VALIDATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "procurement_id" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "payment_percentage" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UPCOMING',
    "payment_date" TIMESTAMP(3),
    "invoice_url" TEXT,
    "reference_number" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_decisions" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "decision" "ScaleDecisionType" NOT NULL,
    "score" DOUBLE PRECISION,
    "reasoning" TEXT NOT NULL,
    "approved_by" TEXT NOT NULL,
    "decision_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'FINALIZED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scale_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_items" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_feedbacks" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "citizen_name" TEXT,
    "beneficiary_type" TEXT NOT NULL DEFAULT 'CITIZEN',
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comments" TEXT NOT NULL,
    "feedback_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "requested_role" "UserRole" NOT NULL DEFAULT 'EVALUATOR',
    "request_source" "AccessRequestSource" NOT NULL DEFAULT 'SELF_REQUEST',
    "department_id" TEXT,
    "department_name" TEXT,
    "state" TEXT,
    "department_code" TEXT,
    "official_website" TEXT,
    "organization" TEXT,
    "designation" TEXT,
    "employment_type" TEXT,
    "domain_expertise" TEXT[],
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "reason" TEXT,
    "supporting_document_url" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "nominated_by_user_id" TEXT,
    "challenge_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluator_assignments" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "status" "EvaluatorAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_records" (
    "id" TEXT NOT NULL,
    "pilot_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "status" "ProcurementStatus" NOT NULL DEFAULT 'DRAFT',
    "route" "ProcurementRoute" NOT NULL DEFAULT 'GEM',
    "estimated_value" DECIMAL(14,2) NOT NULL,
    "final_contract_value" DECIMAL(14,2),
    "justification" TEXT NOT NULL,
    "technical_readiness" BOOLEAN NOT NULL DEFAULT false,
    "compliance_readiness" BOOLEAN NOT NULL DEFAULT false,
    "cybersecurity_clearance" BOOLEAN NOT NULL DEFAULT false,
    "data_protection_clearance" BOOLEAN NOT NULL DEFAULT false,
    "initiated_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_notes" TEXT,
    "rejection_reason" TEXT,
    "gem_handoff_status" "GeMHandoffStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "gem_handoff_date" TIMESTAMP(3),
    "gem_reference_number" TEXT,
    "gem_officer_name" TEXT,
    "gem_notes" TEXT,
    "gem_supporting_doc" TEXT,
    "po_reference_number" TEXT,
    "contract_reference" TEXT,
    "contract_document_url" TEXT,
    "contract_issued_at" TIMESTAMP(3),
    "contract_effective_date" TIMESTAMP(3),
    "contract_duration_days" INTEGER,
    "delivery_date" TIMESTAMP(3),
    "delivery_scope" TEXT,
    "delivery_evidence_url" TEXT,
    "delivery_notes" TEXT,
    "acceptance_status" "AcceptanceStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "acceptance_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criteria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fields_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "schema_definition" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_invitation_token_hash_idx" ON "users"("invitation_token_hash");

-- CreateIndex
CREATE INDEX "users_email_verification_token_hash_idx" ON "users"("email_verification_token_hash");

-- CreateIndex
CREATE INDEX "challenges_status_idx" ON "challenges"("status");

-- CreateIndex
CREATE INDEX "challenges_department_id_idx" ON "challenges"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_eligibility_reviews_challenge_id_key" ON "challenge_eligibility_reviews"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_eligibility_reviews_challenge_id_idx" ON "challenge_eligibility_reviews"("challenge_id");

-- CreateIndex
CREATE INDEX "match_scores_overall_score_idx" ON "match_scores"("overall_score");

-- CreateIndex
CREATE UNIQUE INDEX "match_scores_challenge_id_startup_id_key" ON "match_scores"("challenge_id", "startup_id");

-- CreateIndex
CREATE INDEX "startups_verification_status_idx" ON "startups"("verification_status");

-- CreateIndex
CREATE INDEX "startups_domain_idx" ON "startups"("domain");

-- CreateIndex
CREATE INDEX "startups_company_name_idx" ON "startups"("company_name");

-- CreateIndex
CREATE INDEX "startups_pan_number_idx" ON "startups"("pan_number");

-- CreateIndex
CREATE INDEX "startups_cin_number_idx" ON "startups"("cin_number");

-- CreateIndex
CREATE INDEX "startups_gstin_idx" ON "startups"("gstin");

-- CreateIndex
CREATE INDEX "startups_dpiit_number_idx" ON "startups"("dpiit_number");

-- CreateIndex
CREATE UNIQUE INDEX "startup_bank_details_startup_id_key" ON "startup_bank_details"("startup_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_challenge_id_startup_id_key" ON "applications"("challenge_id", "startup_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluator_profiles_user_id_key" ON "evaluator_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conflict_declarations_application_id_evaluator_id_key" ON "conflict_declarations"("application_id", "evaluator_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_application_id_evaluator_id_key" ON "evaluations"("application_id", "evaluator_id");

-- CreateIndex
CREATE INDEX "application_documents_application_id_idx" ON "application_documents"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_proposal_analyses_application_id_key" ON "application_proposal_analyses"("application_id");

-- CreateIndex
CREATE INDEX "evaluator_match_scores_challenge_id_idx" ON "evaluator_match_scores"("challenge_id");

-- CreateIndex
CREATE INDEX "evaluator_match_scores_overall_score_idx" ON "evaluator_match_scores"("overall_score");

-- CreateIndex
CREATE UNIQUE INDEX "evaluator_match_scores_challenge_id_evaluator_id_key" ON "evaluator_match_scores"("challenge_id", "evaluator_id");

-- CreateIndex
CREATE INDEX "evaluator_applications_challenge_id_idx" ON "evaluator_applications"("challenge_id");

-- CreateIndex
CREATE INDEX "evaluator_applications_evaluator_id_idx" ON "evaluator_applications"("evaluator_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluator_applications_challenge_id_evaluator_id_key" ON "evaluator_applications"("challenge_id", "evaluator_id");

-- CreateIndex
CREATE INDEX "challenge_evaluator_pools_challenge_id_idx" ON "challenge_evaluator_pools"("challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_evaluator_pools_challenge_id_evaluator_id_key" ON "challenge_evaluator_pools"("challenge_id", "evaluator_id");

-- CreateIndex
CREATE INDEX "pilots_status_idx" ON "pilots"("status");

-- CreateIndex
CREATE INDEX "pilot_measurements_pilot_id_kpi_id_idx" ON "pilot_measurements"("pilot_id", "kpi_id");

-- CreateIndex
CREATE INDEX "pilot_progress_updates_pilot_id_idx" ON "pilot_progress_updates"("pilot_id");

-- CreateIndex
CREATE INDEX "pilot_progress_updates_created_at_idx" ON "pilot_progress_updates"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- CreateIndex
CREATE INDEX "access_requests_requested_role_idx" ON "access_requests"("requested_role");

-- CreateIndex
CREATE INDEX "access_requests_request_source_idx" ON "access_requests"("request_source");

-- CreateIndex
CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");

-- CreateIndex
CREATE INDEX "access_requests_department_id_idx" ON "access_requests"("department_id");

-- CreateIndex
CREATE INDEX "access_requests_created_at_idx" ON "access_requests"("created_at");

-- CreateIndex
CREATE INDEX "access_requests_reviewed_by_idx" ON "access_requests"("reviewed_by");

-- CreateIndex
CREATE INDEX "access_requests_requested_role_status_idx" ON "access_requests"("requested_role", "status");

-- CreateIndex
CREATE INDEX "access_requests_email_status_idx" ON "access_requests"("email", "status");

-- CreateIndex
CREATE INDEX "evaluator_assignments_status_idx" ON "evaluator_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluator_assignments_application_id_evaluator_id_key" ON "evaluator_assignments"("application_id", "evaluator_id");

-- CreateIndex
CREATE INDEX "procurement_records_status_idx" ON "procurement_records"("status");

-- CreateIndex
CREATE INDEX "procurement_records_route_idx" ON "procurement_records"("route");

-- CreateIndex
CREATE INDEX "procurement_records_pilot_id_idx" ON "procurement_records"("pilot_id");

-- CreateIndex
CREATE INDEX "procurement_records_department_id_idx" ON "procurement_records"("department_id");

-- CreateIndex
CREATE INDEX "procurement_records_startup_id_idx" ON "procurement_records"("startup_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_eligibility_reviews" ADD CONSTRAINT "challenge_eligibility_reviews_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_eligibility_reviews" ADD CONSTRAINT "challenge_eligibility_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startups" ADD CONSTRAINT "startups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startups" ADD CONSTRAINT "startups_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startups" ADD CONSTRAINT "startups_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_bank_details" ADD CONSTRAINT "startup_bank_details_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_documents" ADD CONSTRAINT "startup_documents_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_documents" ADD CONSTRAINT "startup_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_profiles" ADD CONSTRAINT "evaluator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_profiles" ADD CONSTRAINT "evaluator_profiles_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_declarations" ADD CONSTRAINT "conflict_declarations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_declarations" ADD CONSTRAINT "conflict_declarations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_proposal_analyses" ADD CONSTRAINT "application_proposal_analyses_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_match_scores" ADD CONSTRAINT "evaluator_match_scores_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_match_scores" ADD CONSTRAINT "evaluator_match_scores_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_applications" ADD CONSTRAINT "evaluator_applications_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_applications" ADD CONSTRAINT "evaluator_applications_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_applications" ADD CONSTRAINT "evaluator_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_evaluator_pools" ADD CONSTRAINT "challenge_evaluator_pools_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_evaluator_pools" ADD CONSTRAINT "challenge_evaluator_pools_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_evaluator_pools" ADD CONSTRAINT "challenge_evaluator_pools_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilots" ADD CONSTRAINT "pilots_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilots" ADD CONSTRAINT "pilots_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_kpis" ADD CONSTRAINT "pilot_kpis_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_measurements" ADD CONSTRAINT "pilot_measurements_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "pilot_kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_measurements" ADD CONSTRAINT "pilot_measurements_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "pilot_kpis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_issues" ADD CONSTRAINT "pilot_issues_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_progress_updates" ADD CONSTRAINT "pilot_progress_updates_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_progress_updates" ADD CONSTRAINT "pilot_progress_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_validator_id_fkey" FOREIGN KEY ("validator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_procurement_id_fkey" FOREIGN KEY ("procurement_id") REFERENCES "procurement_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_decisions" ADD CONSTRAINT "scale_decisions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_decisions" ADD CONSTRAINT "scale_decisions_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_feedbacks" ADD CONSTRAINT "pilot_feedbacks_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_nominated_by_user_id_fkey" FOREIGN KEY ("nominated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique indexes to prevent active duplicate registrations while permitting re-applications after rejection
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_pan_unique" ON "startups"("pan_number") WHERE "verification_status" != 'REJECTED' AND "pan_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_cin_unique" ON "startups"("cin_number") WHERE "verification_status" != 'REJECTED' AND "cin_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_gstin_unique" ON "startups"("gstin") WHERE "verification_status" != 'REJECTED' AND "gstin" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_dpiit_unique" ON "startups"("dpiit_number") WHERE "verification_status" != 'REJECTED' AND "dpiit_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "access_requests_active_email_unique" ON "access_requests"("email") WHERE "status" IN ('PENDING', 'UNDER_REVIEW', 'APPROVED');


