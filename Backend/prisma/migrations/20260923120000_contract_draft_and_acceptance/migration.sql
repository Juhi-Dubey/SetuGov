-- AlterEnum
ALTER TYPE "ProcurementStatus" ADD VALUE 'CONTRACT_ACCEPTED';
ALTER TYPE "ProcurementStatus" ADD VALUE 'CONTRACT_DECLINED';

-- AlterTable
ALTER TABLE "procurement_records" ADD COLUMN IF NOT EXISTS "contract_accepted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "contract_accepted_by" TEXT,
ADD COLUMN IF NOT EXISTS "contract_decline_notes" TEXT,
ADD COLUMN IF NOT EXISTS "contract_draft_content" JSONB;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'procurement_records_contract_accepted_by_fkey') THEN
    ALTER TABLE "procurement_records" ADD CONSTRAINT "procurement_records_contract_accepted_by_fkey" FOREIGN KEY ("contract_accepted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
