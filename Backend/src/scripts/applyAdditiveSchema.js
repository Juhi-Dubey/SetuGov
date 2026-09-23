import { prisma } from '../config/prisma.js';

async function main() {
  console.log('Applying additive schema updates to database...');

  const statements = [
    // 1. Add columns to challenges table
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "finalist_submission_start" TIMESTAMP(3);`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "finalist_submission_deadline" TIMESTAMP(3);`,

    // 2. Add is_submitted to evaluations table
    `ALTER TABLE "evaluations" ADD COLUMN IF NOT EXISTS "is_submitted" BOOLEAN NOT NULL DEFAULT true;`,

    // 3. Create application_documents table
    `CREATE TABLE IF NOT EXISTS "application_documents" (
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
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "application_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "application_documents_application_id_idx" ON "application_documents"("application_id");`,

    // 4. Create application_proposal_analyses table
    `CREATE TABLE IF NOT EXISTS "application_proposal_analyses" (
      "id" TEXT NOT NULL,
      "application_id" TEXT NOT NULL,
      "model_name" TEXT,
      "executive_summary" TEXT NOT NULL,
      "technical_feasibility" TEXT NOT NULL,
      "innovation" TEXT NOT NULL,
      "expected_impact" TEXT NOT NULL,
      "scalability" TEXT NOT NULL,
      "cost_effectiveness" TEXT NOT NULL,
      "strengths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "weaknesses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "risks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "missing_information" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "evaluator_questions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "raw_analysis" JSONB,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "application_proposal_analyses_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "application_proposal_analyses_application_id_key" UNIQUE ("application_id"),
      CONSTRAINT "application_proposal_analyses_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

    // 5. Create evaluator_match_scores table
    `CREATE TABLE IF NOT EXISTS "evaluator_match_scores" (
      "id" TEXT NOT NULL,
      "challenge_id" TEXT NOT NULL,
      "evaluator_id" TEXT NOT NULL,
      "overall_score" DOUBLE PRECISION NOT NULL,
      "domain_score" DOUBLE PRECISION NOT NULL,
      "experience_score" DOUBLE PRECISION NOT NULL,
      "tech_score" DOUBLE PRECISION NOT NULL,
      "capability_score" DOUBLE PRECISION NOT NULL,
      "eligibility_state" TEXT NOT NULL DEFAULT 'ELIGIBLE',
      "eligibility_reasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "breakdown" JSONB,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "evaluator_match_scores_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "evaluator_match_scores_challenge_id_evaluator_id_key" UNIQUE ("challenge_id", "evaluator_id"),
      CONSTRAINT "evaluator_match_scores_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "evaluator_match_scores_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "evaluator_match_scores_challenge_id_idx" ON "evaluator_match_scores"("challenge_id");`,
    `CREATE INDEX IF NOT EXISTS "evaluator_match_scores_overall_score_idx" ON "evaluator_match_scores"("overall_score");`,

    // 6. Create evaluator_applications table
    `CREATE TABLE IF NOT EXISTS "evaluator_applications" (
      "id" TEXT NOT NULL,
      "challenge_id" TEXT NOT NULL,
      "evaluator_id" TEXT NOT NULL,
      "statement" TEXT,
      "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
      "reviewed_by" TEXT,
      "reviewed_at" TIMESTAMP(3),
      "review_reason" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "evaluator_applications_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "evaluator_applications_challenge_id_evaluator_id_key" UNIQUE ("challenge_id", "evaluator_id"),
      CONSTRAINT "evaluator_applications_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "evaluator_applications_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "evaluator_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "evaluator_applications_challenge_id_idx" ON "evaluator_applications"("challenge_id");`,
    `CREATE INDEX IF NOT EXISTS "evaluator_applications_evaluator_id_idx" ON "evaluator_applications"("evaluator_id");`,

    // 7. Create challenge_evaluator_pools table
    `CREATE TABLE IF NOT EXISTS "challenge_evaluator_pools" (
      "id" TEXT NOT NULL,
      "challenge_id" TEXT NOT NULL,
      "evaluator_id" TEXT NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'MATCHED',
      "added_by" TEXT NOT NULL,
      "notes" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "challenge_evaluator_pools_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "challenge_evaluator_pools_challenge_id_evaluator_id_key" UNIQUE ("challenge_id", "evaluator_id"),
      CONSTRAINT "challenge_evaluator_pools_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "challenge_evaluator_pools_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "challenge_evaluator_pools_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "challenge_evaluator_pools_challenge_id_idx" ON "challenge_evaluator_pools"("challenge_id");`,

    // 8. Create pilot_progress_updates table
    `CREATE TABLE IF NOT EXISTS "pilot_progress_updates" (
      "id" TEXT NOT NULL,
      "pilot_id" TEXT NOT NULL,
      "user_id" TEXT,
      "title" TEXT NOT NULL DEFAULT 'Startup Progress Update',
      "description" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pilot_progress_updates_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "pilot_progress_updates_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "pilot_progress_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "pilot_progress_updates_pilot_id_idx" ON "pilot_progress_updates"("pilot_id");`,
    `CREATE INDEX IF NOT EXISTS "pilot_progress_updates_created_at_idx" ON "pilot_progress_updates"("created_at");`,

    // 9. Evaluator recruitment intake and assignment response timestamp
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "evaluator_recruitment_status" VARCHAR(50) DEFAULT 'OPEN';`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "required_evaluator_count" INTEGER DEFAULT 3;`,
    `ALTER TABLE "evaluator_assignments" ADD COLUMN IF NOT EXISTS "responded_at" TIMESTAMP(3);`,
    `UPDATE "challenges" SET "evaluator_recruitment_status" = 'OPEN' WHERE "evaluator_recruitment_status" IS NULL;`,
    `UPDATE "challenges" SET "required_evaluator_count" = 3 WHERE "required_evaluator_count" IS NULL;`,

    // 10. Additional challenge lifecycle & specification fields
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "current_process" TEXT;`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "pilot_location" TEXT;`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "pilot_start_date" TIMESTAMP(3);`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "pilot_end_date" TIMESTAMP(3);`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "startup_requirements" TEXT;`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "kpis" JSONB;`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "milestones" JSONB;`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "eligibility_requirements" JSONB;`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "required_documents" JSONB;`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "cybersecurity_requirements" TEXT;`,
    `ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "data_compliance" TEXT;`,

    // 11. Create challenge_eligibility_reviews table
    `CREATE TABLE IF NOT EXISTS "challenge_eligibility_reviews" (
      "id" TEXT NOT NULL,
      "challenge_id" TEXT NOT NULL,
      "reviewed_by" TEXT NOT NULL,
      "decision" TEXT NOT NULL DEFAULT 'PENDING',
      "remarks" TEXT,
      "checks" JSONB NOT NULL,
      "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "challenge_eligibility_reviews_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "challenge_eligibility_reviews_challenge_id_key" UNIQUE ("challenge_id"),
      CONSTRAINT "challenge_eligibility_reviews_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "challenge_eligibility_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "challenge_eligibility_reviews_challenge_id_idx" ON "challenge_eligibility_reviews"("challenge_id");`,

    // 12. A1: Add CHANGES_REQUESTED to ApplicationStatus enum
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CHANGES_REQUESTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ApplicationStatus')) THEN ALTER TYPE "ApplicationStatus" ADD VALUE 'CHANGES_REQUESTED'; END IF; END $$;`,

    // 13. A1: Add change-request tracking fields to applications
    `ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "change_request_notes" TEXT;`,
    `ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "change_requested_at" TIMESTAMP(3);`,
    `ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "change_requested_by" TEXT;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'applications_change_requested_by_fkey') THEN ALTER TABLE "applications" ADD CONSTRAINT "applications_change_requested_by_fkey" FOREIGN KEY ("change_requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,

    // 14. A1: Add evaluator change-suggestion fields to evaluations
    `ALTER TABLE "evaluations" ADD COLUMN IF NOT EXISTS "suggest_changes" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "evaluations" ADD COLUMN IF NOT EXISTS "change_suggestion_notes" TEXT;`,

    // 15. A1: Create archived_evaluations table for evaluation history across resubmissions
    `CREATE TABLE IF NOT EXISTS "archived_evaluations" (
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
      "suggest_changes" BOOLEAN NOT NULL DEFAULT false,
      "change_suggestion_notes" TEXT,
      "is_submitted" BOOLEAN NOT NULL DEFAULT true,
      "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "original_created_at" TIMESTAMP(3) NOT NULL,
      "original_updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "archived_evaluations_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "archived_evaluations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "archived_evaluations_application_id_idx" ON "archived_evaluations"("application_id");`,

    // 16. C3b: Add CONTRACT_ACCEPTED and CONTRACT_DECLINED to ProcurementStatus enum
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONTRACT_ACCEPTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ProcurementStatus')) THEN ALTER TYPE "ProcurementStatus" ADD VALUE 'CONTRACT_ACCEPTED'; END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONTRACT_DECLINED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ProcurementStatus')) THEN ALTER TYPE "ProcurementStatus" ADD VALUE 'CONTRACT_DECLINED'; END IF; END $$;`,

    // 17. C3: Add contract acceptance, decline, and draft fields to procurement_records
    `ALTER TABLE "procurement_records" ADD COLUMN IF NOT EXISTS "contract_accepted_at" TIMESTAMP(3);`,
    `ALTER TABLE "procurement_records" ADD COLUMN IF NOT EXISTS "contract_accepted_by" TEXT;`,
    `ALTER TABLE "procurement_records" ADD COLUMN IF NOT EXISTS "contract_decline_notes" TEXT;`,
    `ALTER TABLE "procurement_records" ADD COLUMN IF NOT EXISTS "contract_draft_content" JSONB;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'procurement_records_contract_accepted_by_fkey') THEN ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_contract_accepted_by_fkey" FOREIGN KEY ("contract_accepted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }

  console.log('✓ All additive tables, columns, indexes, and foreign keys successfully created/verified!');
  process.exit(0);
}

main().catch(err => {
  console.error('Additive schema error:', err);
  process.exit(1);
});
