import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma.js';
import { logger } from '../src/utils/logger.js';

/**
 * CLEAN DATABASE SCRIPT FOR NEON POSTGRESQL
 * Safely removes leftover test/demo/fake business activity and non-demo users.
 * Preserves ONLY:
 * 1. The 4 canonical demo users (ADMIN, GOVERNMENT, EVALUATOR, STARTUP)
 * 2. Their required supporting records (Department, EvaluatorProfile, Startup)
 * 3. Genuine platform configuration (SystemSetting, SystemTemplate, EvaluationCriterion)
 */

const CANONICAL_EMAILS = {
  admin: 'admin@setugov.in',
  government: 'ramesh.kumar@health.gov.in',
  evaluator: 'anita.desai@evaluators.setugov.in',
  startup: 'vikas@mediqueue.ai'
};

async function cleanDatabase() {
  console.log('====================================================');
  console.log('🧹 STARTING NEON DATABASE CLEANUP FOR SETUGOV');
  console.log('====================================================');

  const initialReport = {};
  const deletedReport = {};

  // 1. Snapshot initial counts of all tables
  const tables = [
    'procurementRecord',
    'scaleDecision',
    'payment',
    'validation',
    'complianceItem',
    'pilotFeedback',
    'pilotIssue',
    'pilotProgressUpdate',
    'risk',
    'evidence',
    'milestone',
    'pilotMeasurement',
    'pilotKpi',
    'pilot',
    'evaluatorAssignment',
    'evaluation',
    'conflictDeclaration',
    'applicationProposalAnalysis',
    'applicationDocument',
    'application',
    'evaluatorApplication',
    'challengeEvaluatorPool',
    'evaluatorMatchScore',
    'matchScore',
    'challengeEligibilityReview',
    'challenge',
    'notification',
    'auditLog',
    'accessRequest',
    'startupDocument',
    'startupBankDetails',
    'startup',
    'evaluatorProfile',
    'department',
    'user',
    'systemSetting',
    'evaluationCriterion',
    'systemTemplate'
  ];

  for (const t of tables) {
    try {
      initialReport[t] = await prisma[t].count();
    } catch (e) {
      initialReport[t] = `Error: ${e.message}`;
    }
  }

  console.log('Initial Table Counts Snapshot:');
  console.table(initialReport);

  // 2. Perform deletions in strict foreign-key dependency order
  console.log('\n🗑️ Executing controlled deletions in foreign-key dependency order...');

  // Pilot-level children
  deletedReport.procurementRecord = (await prisma.procurementRecord.deleteMany({})).count;
  deletedReport.scaleDecision = (await prisma.scaleDecision.deleteMany({})).count;
  deletedReport.payment = (await prisma.payment.deleteMany({})).count;
  deletedReport.validation = (await prisma.validation.deleteMany({})).count;
  deletedReport.complianceItem = (await prisma.complianceItem.deleteMany({})).count;
  deletedReport.pilotFeedback = (await prisma.pilotFeedback.deleteMany({})).count;
  deletedReport.pilotIssue = (await prisma.pilotIssue.deleteMany({})).count;
  deletedReport.pilotProgressUpdate = (await prisma.pilotProgressUpdate.deleteMany({})).count;
  deletedReport.risk = (await prisma.risk.deleteMany({})).count;
  deletedReport.evidence = (await prisma.evidence.deleteMany({})).count;
  deletedReport.milestone = (await prisma.milestone.deleteMany({})).count;
  deletedReport.pilotMeasurement = (await prisma.pilotMeasurement.deleteMany({})).count;
  deletedReport.pilotKpi = (await prisma.pilotKpi.deleteMany({})).count;
  deletedReport.pilot = (await prisma.pilot.deleteMany({})).count;

  // Application-level children
  deletedReport.evaluatorAssignment = (await prisma.evaluatorAssignment.deleteMany({})).count;
  deletedReport.evaluation = (await prisma.evaluation.deleteMany({})).count;
  deletedReport.conflictDeclaration = (await prisma.conflictDeclaration.deleteMany({})).count;
  deletedReport.applicationProposalAnalysis = (await prisma.applicationProposalAnalysis.deleteMany({})).count;
  deletedReport.applicationDocument = (await prisma.applicationDocument.deleteMany({})).count;
  deletedReport.application = (await prisma.application.deleteMany({})).count;

  // Challenge-level children
  deletedReport.evaluatorApplication = (await prisma.evaluatorApplication.deleteMany({})).count;
  deletedReport.challengeEvaluatorPool = (await prisma.challengeEvaluatorPool.deleteMany({})).count;
  deletedReport.evaluatorMatchScore = (await prisma.evaluatorMatchScore.deleteMany({})).count;
  deletedReport.matchScore = (await prisma.matchScore.deleteMany({})).count;
  deletedReport.challengeEligibilityReview = (await prisma.challengeEligibilityReview.deleteMany({})).count;
  deletedReport.challenge = (await prisma.challenge.deleteMany({})).count;

  // Platform logs, notifications, access requests
  deletedReport.notification = (await prisma.notification.deleteMany({})).count;
  deletedReport.auditLog = (await prisma.auditLog.deleteMany({})).count;
  deletedReport.accessRequest = (await prisma.accessRequest.deleteMany({})).count;
  deletedReport.startupDocument = (await prisma.startupDocument.deleteMany({})).count;

  // Remove non-demo startup bank details
  deletedReport.startupBankDetails = (await prisma.startupBankDetails.deleteMany({
    where: {
      startup: {
        user: {
          email: { not: CANONICAL_EMAILS.startup }
        }
      }
    }
  })).count;

  // Remove non-demo startups (including any empty startup records)
  deletedReport.startup = (await prisma.startup.deleteMany({
    where: {
      user: {
        email: { not: CANONICAL_EMAILS.startup }
      }
    }
  })).count;

  // Remove non-demo evaluator profiles
  deletedReport.evaluatorProfile = (await prisma.evaluatorProfile.deleteMany({
    where: {
      user: {
        email: { not: CANONICAL_EMAILS.evaluator }
      }
    }
  })).count;

  // Remove non-demo users FIRST unlinking any department references
  const nonDemoUsers = await prisma.user.findMany({
    where: {
      email: { notIn: Object.values(CANONICAL_EMAILS) }
    },
    select: { id: true, email: true }
  });

  // Unlink department from non-demo users before deleting departments
  await prisma.user.updateMany({
    where: {
      email: { notIn: Object.values(CANONICAL_EMAILS) }
    },
    data: {
      department_id: null
    }
  });

  // Remove non-demo departments
  deletedReport.department = (await prisma.department.deleteMany({
    where: {
      name: { not: 'Department of Health & Family Welfare' }
    }
  })).count;

  // Delete non-demo users
  deletedReport.user = (await prisma.user.deleteMany({
    where: {
      email: { notIn: Object.values(CANONICAL_EMAILS) }
    }
  })).count;

  console.log('\nRecords Deleted Summary:');
  console.table(deletedReport);

  // 3. Ensure the single required Department exists and is correctly configured
  console.log('\n🏢 Verifying required Department of Health & Family Welfare...');
  let healthDept = await prisma.department.findFirst({
    where: { name: 'Department of Health & Family Welfare' }
  });

  if (!healthDept) {
    healthDept = await prisma.department.create({
      data: {
        name: 'Department of Health & Family Welfare',
        state: 'Karnataka',
        contact_email: 'health.kar@gov.in',
        department_code: 'DOHFW_KA',
        nodal_officer_name: 'Dr. Ramesh Kumar',
        nodal_officer_designation: 'Director of Health',
        nodal_officer_phone: '+91 80 2235 5555',
        official_website: 'https://hfw.karnataka.gov.in',
        verification_status: 'VERIFIED'
      }
    });
  } else {
    healthDept = await prisma.department.update({
      where: { id: healthDept.id },
      data: {
        state: 'Karnataka',
        contact_email: 'health.kar@gov.in',
        department_code: 'DOHFW_KA',
        nodal_officer_name: 'Dr. Ramesh Kumar',
        nodal_officer_designation: 'Director of Health',
        nodal_officer_phone: '+91 80 2235 5555',
        official_website: 'https://hfw.karnataka.gov.in',
        verification_status: 'VERIFIED'
      }
    });
  }

  // 4. Ensure the 4 canonical demo users exist with valid credentials
  console.log('\n👤 Verifying and securing the 4 intended demo accounts...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // (1) ADMIN
  const adminUser = await prisma.user.upsert({
    where: { email: CANONICAL_EMAILS.admin },
    update: {
      name: 'Priya Sharma (State Innovation Officer)',
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true,
      is_verified: true,
      department_id: null,
      failed_login_attempts: 0,
      locked_until: null
    },
    create: {
      name: 'Priya Sharma (State Innovation Officer)',
      email: CANONICAL_EMAILS.admin,
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0
    }
  });

  // (2) GOVERNMENT
  const govUser = await prisma.user.upsert({
    where: { email: CANONICAL_EMAILS.government },
    update: {
      name: 'Dr. Ramesh Kumar (Director of Health)',
      password_hash: passwordHash,
      role: 'GOVERNMENT',
      department_id: healthDept.id,
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0,
      locked_until: null
    },
    create: {
      name: 'Dr. Ramesh Kumar (Director of Health)',
      email: CANONICAL_EMAILS.government,
      password_hash: passwordHash,
      role: 'GOVERNMENT',
      department_id: healthDept.id,
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0
    }
  });

  // (3) EVALUATOR
  const evalUser = await prisma.user.upsert({
    where: { email: CANONICAL_EMAILS.evaluator },
    update: {
      name: 'Dr. Anita Desai (Healthcare Systems Specialist)',
      password_hash: passwordHash,
      role: 'EVALUATOR',
      is_active: true,
      is_verified: true,
      department_id: null,
      failed_login_attempts: 0,
      locked_until: null
    },
    create: {
      name: 'Dr. Anita Desai (Healthcare Systems Specialist)',
      email: CANONICAL_EMAILS.evaluator,
      password_hash: passwordHash,
      role: 'EVALUATOR',
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0
    }
  });

  // Supporting Evaluator Profile for Dr. Anita Desai
  await prisma.evaluatorProfile.upsert({
    where: { user_id: evalUser.id },
    update: {
      organization: 'National Health Authority',
      designation: 'Principal Systems Evaluator',
      employment_type: 'FULL_TIME',
      years_experience: 12,
      domain_expertise: ['Healthcare Systems', 'ABDM', 'Clinical Workflows'],
      verification_status: 'VERIFIED',
      verified_by: adminUser.id
    },
    create: {
      user_id: evalUser.id,
      organization: 'National Health Authority',
      designation: 'Principal Systems Evaluator',
      employment_type: 'FULL_TIME',
      years_experience: 12,
      domain_expertise: ['Healthcare Systems', 'ABDM', 'Clinical Workflows'],
      verification_status: 'VERIFIED',
      verified_by: adminUser.id
    }
  });

  // (4) STARTUP
  const startupUser = await prisma.user.upsert({
    where: { email: CANONICAL_EMAILS.startup },
    update: {
      name: 'Vikas Sharma',
      password_hash: passwordHash,
      role: 'STARTUP',
      is_active: true,
      is_verified: true,
      department_id: null,
      failed_login_attempts: 0,
      locked_until: null
    },
    create: {
      name: 'Vikas Sharma',
      email: CANONICAL_EMAILS.startup,
      password_hash: passwordHash,
      role: 'STARTUP',
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0
    }
  });

  // Supporting Startup for Vikas Sharma
  let startupRecord = await prisma.startup.findFirst({
    where: { user_id: startupUser.id }
  });

  const startupData = {
    user_id: startupUser.id,
    company_name: 'MediQueue AI Technologies Pvt Ltd',
    description: 'Next-generation hospital OPD queue optimization, automated token dispensing, real-time wait estimation using computer vision, and ABHA/FHIR integration.',
    domain: 'Healthcare',
    technologies: ['AI Queue Management', 'Computer Vision', 'FHIR / ABDM API', 'Predictive Analytics', 'React Native'],
    readiness_level: 8,
    years_experience: 4,
    previous_deployments: 5,
    location: 'Bangalore, Karnataka',
    verification_status: 'VERIFIED',
    org_type: 'PRIVATE_LIMITED',
    registered_address: 'No. 42, Innovation Hub, Outer Ring Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560103',
    official_email: 'contact@mediqueue.ai',
    official_website: 'https://mediqueue.ai',
    authorized_person_name: 'Vikas Sharma',
    authorized_person_designation: 'Founder & CEO',
    authorized_person_email: 'vikas@mediqueue.ai',
    authorized_person_phone: '+91 98450 12345',
    pan_number: 'AABCM1234F',
    cin_number: 'U72900KA2021PTC145678',
    gstin: '29AABCM1234F1Z5',
    dpiit_number: 'DIPP89012',
    verified_by: adminUser.id
  };

  if (!startupRecord) {
    startupRecord = await prisma.startup.create({ data: startupData });
  } else {
    startupRecord = await prisma.startup.update({
      where: { id: startupRecord.id },
      data: startupData
    });
  }

  // Supporting Bank Details for MediQueue AI
  await prisma.startupBankDetails.upsert({
    where: { startup_id: startupRecord.id },
    update: {
      account_holder_name: 'MediQueue AI Technologies Pvt Ltd',
      bank_name: 'State Bank of India',
      account_number: '39482710592',
      ifsc_code: 'SBIN0004123',
      branch_name: 'Koramangala Commercial Branch',
      account_type: 'CURRENT'
    },
    create: {
      startup_id: startupRecord.id,
      account_holder_name: 'MediQueue AI Technologies Pvt Ltd',
      bank_name: 'State Bank of India',
      account_number: '39482710592',
      ifsc_code: 'SBIN0004123',
      branch_name: 'Koramangala Commercial Branch',
      account_type: 'CURRENT'
    }
  });

  // 5. Final Verification and Counts Check
  console.log('\n====================================================');
  console.log('📊 FINAL DATABASE COUNTS VERIFICATION');
  console.log('====================================================');

  const finalCounts = {};
  for (const t of tables) {
    finalCounts[t] = await prisma[t].count();
  }
  console.table(finalCounts);

  // Assert expected counts
  const assertions = [
    { label: 'Challenge count must be 0', expected: 0, actual: finalCounts.challenge },
    { label: 'Application count must be 0', expected: 0, actual: finalCounts.application },
    { label: 'ApplicationDocument count must be 0', expected: 0, actual: finalCounts.applicationDocument },
    { label: 'ChallengeEvaluatorPool count must be 0', expected: 0, actual: finalCounts.challengeEvaluatorPool },
    { label: 'MatchScore count must be 0', expected: 0, actual: finalCounts.matchScore },
    { label: 'EvaluatorMatchScore count must be 0', expected: 0, actual: finalCounts.evaluatorMatchScore },
    { label: 'EvaluatorAssignment count must be 0', expected: 0, actual: finalCounts.evaluatorAssignment },
    { label: 'Evaluation count must be 0', expected: 0, actual: finalCounts.evaluation },
    { label: 'ConflictDeclaration count must be 0', expected: 0, actual: finalCounts.conflictDeclaration },
    { label: 'Pilot count must be 0', expected: 0, actual: finalCounts.pilot },
    { label: 'PilotKpi count must be 0', expected: 0, actual: finalCounts.pilotKpi },
    { label: 'PilotMeasurement count must be 0', expected: 0, actual: finalCounts.pilotMeasurement },
    { label: 'Milestone count must be 0', expected: 0, actual: finalCounts.milestone },
    { label: 'Evidence count must be 0', expected: 0, actual: finalCounts.evidence },
    { label: 'Risk count must be 0', expected: 0, actual: finalCounts.risk },
    { label: 'Validation count must be 0', expected: 0, actual: finalCounts.validation },
    { label: 'ScaleDecision count must be 0', expected: 0, actual: finalCounts.scaleDecision },
    { label: 'ProcurementRecord count must be 0', expected: 0, actual: finalCounts.procurementRecord },
    { label: 'Payment count must be 0', expected: 0, actual: finalCounts.payment },
    { label: 'PilotFeedback count must be 0', expected: 0, actual: finalCounts.pilotFeedback },
    { label: 'PilotIssue count must be 0', expected: 0, actual: finalCounts.pilotIssue },
    { label: 'AccessRequest count must be 0', expected: 0, actual: finalCounts.accessRequest },
    { label: 'Notification count must be 0', expected: 0, actual: finalCounts.notification },
    { label: 'AuditLog count must be 0', expected: 0, actual: finalCounts.auditLog },
    { label: 'User count must be exactly 4 demo accounts', expected: 4, actual: finalCounts.user },
    { label: 'Department count must be exactly 1', expected: 1, actual: finalCounts.department },
    { label: 'EvaluatorProfile count must be exactly 1', expected: 1, actual: finalCounts.evaluatorProfile },
    { label: 'Startup count must be exactly 1', expected: 1, actual: finalCounts.startup }
  ];

  console.log('\n--- VERIFICATION ASSERTIONS ---');
  let allPassed = true;
  for (const a of assertions) {
    const passed = a.actual === a.expected;
    if (passed) {
      console.log(`✅ [PASS] ${a.label} (${a.actual})`);
    } else {
      console.log(`❌ [FAIL] ${a.label} (Expected ${a.expected}, got ${a.actual})`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    throw new Error('Database cleanup verification failed one or more count assertions.');
  }

  console.log('\n====================================================');
  console.log('✨ DATABASE CLEANUP COMPLETED AND VERIFIED 100% CLEAN!');
  console.log('Preserved Accounts:');
  console.log('  ADMIN:      admin@setugov.in / Password123!');
  console.log('  GOVERNMENT: ramesh.kumar@health.gov.in / Password123!');
  console.log('  EVALUATOR:  anita.desai@evaluators.setugov.in / Password123!');
  console.log('  STARTUP:    vikas@mediqueue.ai / Password123!');
  console.log('====================================================');
}

cleanDatabase()
  .catch((err) => {
    console.error('❌ Database cleanup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
