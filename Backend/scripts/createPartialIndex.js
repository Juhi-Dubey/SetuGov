import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('Creating partial unique indexes for active access requests...');

  // Clean up any duplicates in test emails by keeping the earliest record
  await prisma.$executeRawUnsafe(`
    DELETE FROM "access_requests" a
    USING "access_requests" b
    WHERE a.id > b.id
      AND a.email = b.email
      AND a.status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED')
      AND b.status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED');
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_access_request_email" 
    ON "access_requests" ("email") 
    WHERE "status" IN ('PENDING', 'UNDER_REVIEW', 'APPROVED');
  `);

  console.log('✅ Partial unique index unique_active_access_request_email created successfully');
}

main()
  .catch((err) => {
    console.error('Index creation failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
