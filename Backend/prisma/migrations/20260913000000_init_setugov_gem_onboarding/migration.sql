-- SetuGov GeM-Style Startup Onboarding Baseline Migration

-- Partial unique indexes to prevent active duplicate registrations while permitting re-applications after rejection
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_pan_unique" ON "startups"("pan_number") WHERE "verification_status" != 'REJECTED' AND "pan_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_cin_unique" ON "startups"("cin_number") WHERE "verification_status" != 'REJECTED' AND "cin_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_gstin_unique" ON "startups"("gstin") WHERE "verification_status" != 'REJECTED' AND "gstin" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_dpiit_unique" ON "startups"("dpiit_number") WHERE "verification_status" != 'REJECTED' AND "dpiit_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "access_requests_active_email_unique" ON "access_requests"("email") WHERE "status" IN ('PENDING', 'UNDER_REVIEW', 'APPROVED');

