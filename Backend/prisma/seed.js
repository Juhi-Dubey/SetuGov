import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma.js';
import { logger } from '../src/utils/logger.js';

/**
 * Baseline System Settings
 */
const DEFAULT_SETTINGS = {
  platformName: 'SetuGov Procurement OS',
  supportEmail: 'support@setugov.gov.in',
  timezone: 'IST (UTC+05:30)',
  currency: 'INR (₹)',
  mfaRequired: true,
  sessionTimeout: '30',
  auditRetentionDays: '365',
  emailNotifications: true,
  challengeSubmissionAlerts: true,
  evaluationReminders: true,
  autoBackupEnabled: true
};

/**
 * Baseline Evaluation Criteria
 */
const DEFAULT_CRITERIA = [
  {
    name: 'Technical Feasibility & Architecture',
    description: 'Evaluates architectural soundness, technology readiness level (TRL), and integration viability.',
    weight: 25.0,
    status: 'Active'
  },
  {
    name: 'Innovation & Uniqueness',
    description: 'Measures intellectual property novelty, differentiation from existing public procurement alternatives.',
    weight: 20.0,
    status: 'Active'
  },
  {
    name: 'Cost-Effectiveness & Commercial Viability',
    description: 'Evaluates pilot budget efficiency, unit economics, and long-term public maintenance affordability.',
    weight: 15.0,
    status: 'Active'
  },
  {
    name: 'Deployment Readiness & Team Capability',
    description: 'Evaluates past track record, regulatory clearances, and operational team capacity.',
    weight: 15.0,
    status: 'Active'
  },
  {
    name: 'Social Impact',
    description: 'Measures the expected social and public-service impact of the solution.',
    weight: 15.0,
    status: 'Active'
  },
  {
    name: 'Compliance & Security',
    description: 'Measures adherence to government data boundary and cybersecurity standards.',
    weight: 10.0,
    status: 'Active'
  }
];

/**
 * Baseline Reusable System Templates
 */
const DEFAULT_TEMPLATES = [
  {
    name: 'Government Challenge Template',
    type: 'Challenge',
    description: 'Standard template for creating outcome-based government challenges.',
    fields_count: 12,
    status: 'Active'
  },
  {
    name: 'Startup Evaluation Template',
    type: 'Evaluation',
    description: 'Standard evaluation form containing innovation, feasibility, scalability and impact criteria.',
    fields_count: 8,
    status: 'Active'
  },
  {
    name: 'Pilot Proposal Template',
    type: 'Pilot',
    description: 'Template for defining pilot objectives, milestones, resources and success metrics.',
    fields_count: 10,
    status: 'Active'
  },
  {
    name: 'Pilot Completion Report',
    type: 'Pilot',
    description: 'Template for documenting pilot outcomes, evidence and performance.',
    fields_count: 9,
    status: 'Active'
  },
  {
    name: 'Procurement Decision Template',
    type: 'Decision',
    description: 'Template for recording the final decision after evaluation and pilot completion.',
    fields_count: 7,
    status: 'Active'
  }
];

const seedDatabase = async () => {
  logger.info('🌱 Starting SetuGov Clean Database Seeding...');

  // 1. Purge all fake business/transactional records in strict foreign-key dependency order
  logger.info('Cleaning old business, pilot, transaction, and challenge records...');

  await prisma.procurementRecord.deleteMany({});
  await prisma.scaleDecision.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.validation.deleteMany({});
  await prisma.complianceItem.deleteMany({});
  await prisma.pilotFeedback.deleteMany({});
  await prisma.pilotIssue.deleteMany({});
  await prisma.pilotProgressUpdate.deleteMany({});
  await prisma.risk.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.pilotMeasurement.deleteMany({});
  await prisma.pilotKpi.deleteMany({});
  await prisma.pilot.deleteMany({});

  await prisma.evaluatorAssignment.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.applicationProposalAnalysis.deleteMany({});
  await prisma.applicationDocument.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.evaluatorApplication.deleteMany({});
  await prisma.challengeEvaluatorPool.deleteMany({});
  await prisma.evaluatorMatchScore.deleteMany({});
  await prisma.matchScore.deleteMany({});
  await prisma.challengeEligibilityReview.deleteMany({});
  await prisma.conflictDeclaration.deleteMany({});
  await prisma.challenge.deleteMany({});

  await prisma.startupBankDetails.deleteMany({});
  await prisma.startupDocument.deleteMany({});
  await prisma.accessRequest.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});

  const demoEmails = [
    'admin@setugov.in',
    'ramesh.kumar@health.gov.in',
    'anita.desai@evaluators.setugov.in',
    'vikas@mediqueue.ai'
  ];

  // Remove non-demo startup bank details
  await prisma.startupBankDetails.deleteMany({
    where: {
      startup: {
        user: {
          email: { not: 'vikas@mediqueue.ai' }
        }
      }
    }
  });

  // Remove non-demo startups
  await prisma.startup.deleteMany({
    where: {
      user: {
        email: { not: 'vikas@mediqueue.ai' }
      }
    }
  });

  // Remove non-demo evaluator profiles
  await prisma.evaluatorProfile.deleteMany({
    where: {
      user: {
        email: { not: 'anita.desai@evaluators.setugov.in' }
      }
    }
  });

  // Remove non-demo users
  await prisma.user.deleteMany({
    where: {
      email: { notIn: demoEmails }
    }
  });

  // Remove departments other than the required Health & Family Welfare department
  await prisma.department.deleteMany({
    where: {
      name: { not: 'Department of Health & Family Welfare' }
    }
  });

  const defaultPassword = 'Password123!';
  const password_hash = await bcrypt.hash(defaultPassword, 10);

  // 2. Seed / Upsert the single required Government Department
  logger.info('Ensuring required Department of Health & Family Welfare exists...');
  let healthDept = await prisma.department.findFirst({
    where: { name: 'Department of Health & Family Welfare' }
  });

  if (!healthDept) {
    healthDept = await prisma.department.create({
      data: {
        name: 'Department of Health & Family Welfare',
        state: 'Karnataka',
        contact_email: 'health.kar@gov.in'
      }
    });
  } else {
    healthDept = await prisma.department.update({
      where: { id: healthDept.id },
      data: {
        state: 'Karnataka',
        contact_email: 'health.kar@gov.in'
      }
    });
  }

  // 3. Seed / Upsert the 4 Demo Users
  logger.info('Upserting the 4 canonical Demo Users...');

  // (1) Admin demo account
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@setugov.in' },
    update: {
      name: 'Priya Sharma (State Innovation Officer)',
      password_hash,
      role: 'ADMIN',
      is_active: true,
      is_verified: true,
      department_id: null,
      failed_login_attempts: 0,
      locked_until: null
    },
    create: {
      name: 'Priya Sharma (State Innovation Officer)',
      email: 'admin@setugov.in',
      password_hash,
      role: 'ADMIN',
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0
    }
  });

  // (2) Government demo account
  const govUser = await prisma.user.upsert({
    where: { email: 'ramesh.kumar@health.gov.in' },
    update: {
      name: 'Dr. Ramesh Kumar (Director of Health)',
      password_hash,
      role: 'GOVERNMENT',
      department_id: healthDept.id,
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0,
      locked_until: null
    },
    create: {
      name: 'Dr. Ramesh Kumar (Director of Health)',
      email: 'ramesh.kumar@health.gov.in',
      password_hash,
      role: 'GOVERNMENT',
      department_id: healthDept.id,
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0
    }
  });

  // (3) Evaluator demo account
  const evalUser = await prisma.user.upsert({
    where: { email: 'anita.desai@evaluators.setugov.in' },
    update: {
      name: 'Dr. Anita Desai (Healthcare Systems Specialist)',
      password_hash,
      role: 'EVALUATOR',
      is_active: true,
      is_verified: true,
      department_id: null,
      failed_login_attempts: 0,
      locked_until: null
    },
    create: {
      name: 'Dr. Anita Desai (Healthcare Systems Specialist)',
      email: 'anita.desai@evaluators.setugov.in',
      password_hash,
      role: 'EVALUATOR',
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0
    }
  });

  // Upsert Evaluator Profile for the Evaluator account
  await prisma.evaluatorProfile.upsert({
    where: { user_id: evalUser.id },
    update: {
      organization: 'National Health Authority',
      designation: 'Principal Systems Evaluator',
      employment_type: 'FULL_TIME',
      years_experience: 12,
      domain_expertise: ['Healthcare Systems', 'ABDM', 'Clinical Workflows'],
      verification_status: 'VERIFIED'
    },
    create: {
      user_id: evalUser.id,
      organization: 'National Health Authority',
      designation: 'Principal Systems Evaluator',
      employment_type: 'FULL_TIME',
      years_experience: 12,
      domain_expertise: ['Healthcare Systems', 'ABDM', 'Clinical Workflows'],
      verification_status: 'VERIFIED'
    }
  });

  // (4) Startup demo account
  const startupUser = await prisma.user.upsert({
    where: { email: 'vikas@mediqueue.ai' },
    update: {
      name: 'Vikas Sharma',
      password_hash,
      role: 'STARTUP',
      is_active: true,
      is_verified: true,
      department_id: null,
      failed_login_attempts: 0,
      locked_until: null
    },
    create: {
      name: 'Vikas Sharma',
      email: 'vikas@mediqueue.ai',
      password_hash,
      role: 'STARTUP',
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0
    }
  });

  // Upsert Startup Record for the Startup account
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
    verification_status: 'VERIFIED'
  };

  if (!startupRecord) {
    await prisma.startup.create({ data: startupData });
  } else {
    await prisma.startup.update({
      where: { id: startupRecord.id },
      data: startupData
    });
  }

  // 4. Seed / Upsert Baseline System Settings
  logger.info('Seeding Baseline System Settings...');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  // 5. Seed / Upsert Baseline Evaluation Criteria
  logger.info('Seeding Baseline Evaluation Criteria...');
  for (const criterion of DEFAULT_CRITERIA) {
    const existing = await prisma.evaluationCriterion.findFirst({
      where: { name: criterion.name }
    });
    if (!existing) {
      await prisma.evaluationCriterion.create({ data: criterion });
    } else {
      await prisma.evaluationCriterion.update({
        where: { id: existing.id },
        data: criterion
      });
    }
  }

  // 6. Seed / Upsert Baseline System Templates
  logger.info('Seeding Baseline System Templates...');
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.systemTemplate.findFirst({
      where: { name: template.name }
    });
    if (!existing) {
      await prisma.systemTemplate.create({ data: template });
    } else {
      await prisma.systemTemplate.update({
        where: { id: existing.id },
        data: template
      });
    }
  }


  logger.info('✅ SetuGov Clean Baseline Seeding Completed Successfully!');
  logger.info('====================================================');
  logger.info('📊 Clean Baseline Demo Accounts:');
  logger.info(`  ADMIN:      ${adminUser.email} / Password123!`);
  logger.info(`  GOVERNMENT: ${govUser.email} / Password123!`);
  logger.info(`  EVALUATOR:  ${evalUser.email} / Password123!`);
  logger.info(`  STARTUP:    ${startupUser.email} / Password123!`);
  logger.info('====================================================');
};

seedDatabase()
  .catch((err) => {
    logger.error('❌ Seeding Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
