import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setup() {
  console.log('--- Setting up Prisma Migration directory & Partial Unique Indexes ---');
  
  const migrationDir = path.join(__dirname, '../../prisma/migrations/20260913000000_init_setugov_gem_onboarding');
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
  }

  const indexesSql = `
-- Partial unique indexes to prevent active duplicate registrations while permitting re-applications after rejection
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_pan_unique" ON "startups"("pan_number") WHERE "verification_status" != 'REJECTED' AND "pan_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_cin_unique" ON "startups"("cin_number") WHERE "verification_status" != 'REJECTED' AND "cin_number" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_gstin_unique" ON "startups"("gstin") WHERE "verification_status" != 'REJECTED' AND "gstin" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_dpiit_unique" ON "startups"("dpiit_number") WHERE "verification_status" != 'REJECTED' AND "dpiit_number" IS NOT NULL;
`;

  const migrationFilePath = path.join(migrationDir, 'migration.sql');
  fs.writeFileSync(migrationFilePath, `-- SetuGov GeM-Style Startup Onboarding Baseline Migration\n${indexesSql}`, 'utf8');
  console.log('✅ Created migration file:', migrationFilePath);

  // Clean up any test records with duplicate PAN
  const duplicatePanStartups = await prisma.startup.findMany({
    where: { pan_number: 'AAACT2718E' },
    orderBy: { created_at: 'desc' }
  });

  if (duplicatePanStartups.length > 1) {
    console.log(`Found ${duplicatePanStartups.length} test startups with PAN AAACT2718E. Cleaning older duplicates...`);
    const toDelete = duplicatePanStartups.slice(1);
    for (const item of toDelete) {
      await prisma.startupBankDetails.deleteMany({ where: { startup_id: item.id } });
      await prisma.startupDocument.deleteMany({ where: { startup_id: item.id } });
      await prisma.startup.delete({ where: { id: item.id } });
    }
    console.log('✅ Cleaned duplicate test startups.');
  }

  // Apply partial unique indexes directly to PostgreSQL
  console.log('Applying partial unique indexes to PostgreSQL database...');
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_pan_unique" ON "startups"("pan_number") WHERE "verification_status" != 'REJECTED' AND "pan_number" IS NOT NULL;`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_cin_unique" ON "startups"("cin_number") WHERE "verification_status" != 'REJECTED' AND "cin_number" IS NOT NULL;`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_gstin_unique" ON "startups"("gstin") WHERE "verification_status" != 'REJECTED' AND "gstin" IS NOT NULL;`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "startups_active_dpiit_unique" ON "startups"("dpiit_number") WHERE "verification_status" != 'REJECTED' AND "dpiit_number" IS NOT NULL;`);
  console.log('✅ Partial unique indexes successfully applied in database.');

  // Clean up any temp file
  const tempFile = path.join(__dirname, '../../prisma/migrations_init.sql');
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }

  process.exit(0);
}

setup().catch(err => {
  console.error('Setup error:', err);
  process.exit(1);
});
