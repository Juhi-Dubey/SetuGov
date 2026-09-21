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
    `UPDATE "challenges" SET "required_evaluator_count" = 3 WHERE "required_evaluator_count" IS NULL;`
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
