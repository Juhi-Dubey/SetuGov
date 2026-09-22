-- CreateIndex: Enforce at most one SELECTED application per challenge
CREATE UNIQUE INDEX IF NOT EXISTS "unique_selected_application_per_challenge" ON "applications"("challenge_id") WHERE "status" = 'SELECTED';
