import { prisma } from '../config/prisma.js';

async function main() {
  console.log('Ensuring lockout and review columns in PostgreSQL...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_failed_login_at" TIMESTAMP(3);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "startups" ADD COLUMN IF NOT EXISTS "reviewed_by" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "startups" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);`);
  console.log('✅ Lockout and review columns ensured successfully in PostgreSQL.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
