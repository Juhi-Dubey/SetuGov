-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'CHANGES_REQUESTED';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "change_request_notes" TEXT,
ADD COLUMN IF NOT EXISTS "change_requested_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "change_requested_by" TEXT;

-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN IF NOT EXISTS "suggest_changes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "change_suggestion_notes" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "archived_evaluations" (
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

    CONSTRAINT "archived_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "archived_evaluations_application_id_idx" ON "archived_evaluations"("application_id");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'applications_change_requested_by_fkey') THEN
    ALTER TABLE "applications" ADD CONSTRAINT "applications_change_requested_by_fkey" FOREIGN KEY ("change_requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'archived_evaluations_application_id_fkey') THEN
    ALTER TABLE "archived_evaluations" ADD CONSTRAINT "archived_evaluations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
