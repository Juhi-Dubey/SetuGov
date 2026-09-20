import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma.js';
import { logger } from '../src/utils/logger.js';

/**
 * Seeding Script for Additional Test Users (4 roles x 5 users each = 20 users)
 * Names:
 *   - Govt1, Govt2, Govt3, Govt4, Govt5
 *   - Startup1, Startup2, Startup3, Startup4, Startup5
 *   - Evaluator1, Evaluator2, Evaluator3, Evaluator4, Evaluator5
 *   - Admin1, Admin2, Admin3, Admin4, Admin5
 * Default Password: Password123!
 */

export const testUsersConfig = {
  password: 'Password123!',
  government: [
    { name: 'Govt1', email: 'govt1@setugov.in', designation: 'Joint Director of Health Systems', phone: '+91 9800000001' },
    { name: 'Govt2', email: 'govt2@setugov.in', designation: 'State Innovation Nodal Officer', phone: '+91 9800000002' },
    { name: 'Govt3', email: 'govt3@setugov.in', designation: 'Chief Procurement Superintendent', phone: '+91 9800000003' },
    { name: 'Govt4', email: 'govt4@setugov.in', designation: 'Public Health Technical Officer', phone: '+91 9800000004' },
    { name: 'Govt5', email: 'govt5@setugov.in', designation: 'Pilot Monitoring & Audit Officer', phone: '+91 9800000005' },
  ],
  startup: [
    {
      name: 'Startup1',
      email: 'startup1@setugov.in',
      phone: '+91 9811000001',
      company_name: 'Startup1 Health AI Technologies',
      description: 'AI-driven hospital triage, computer vision queue management, and automated patient routing.',
      domain: 'Healthcare',
      technologies: ['AI Queue Management', 'Computer Vision', 'FHIR / ABDM API', 'Predictive Analytics'],
      readiness_level: 8,
      years_experience: 4,
      previous_deployments: 5,
      location: 'Bangalore, Karnataka',
      pan_number: 'AAAAA1001A',
      cin_number: 'U72900KA2023PTC100001',
      gstin: '29AAAAA1001A1Z1',
      dpiit_number: 'DIPP100001'
    },
    {
      name: 'Startup2',
      email: 'startup2@setugov.in',
      phone: '+91 9811000002',
      company_name: 'Startup2 TeleHealth Labs',
      description: 'Decentralized tele-consultation kiosks and ABDM-compliant remote health monitoring diagnostics.',
      domain: 'Healthcare',
      technologies: ['Telemedicine', 'ABDM Gateway', 'IoT Diagnostics', 'WebRTC Audio/Video'],
      readiness_level: 7,
      years_experience: 3,
      previous_deployments: 4,
      location: 'Bangalore, Karnataka',
      pan_number: 'AAAAA1002A',
      cin_number: 'U72900KA2023PTC100002',
      gstin: '29AAAAA1002A1Z2',
      dpiit_number: 'DIPP100002'
    },
    {
      name: 'Startup3',
      email: 'startup3@setugov.in',
      phone: '+91 9811000003',
      company_name: 'Startup3 CleanGov Robotics',
      description: 'Autonomous waste segregation and robotic hospital sanitation management.',
      domain: 'Sanitation',
      technologies: ['Robotics', 'Computer Vision', 'IoT Sensors', 'Autonomous Navigation'],
      readiness_level: 8,
      years_experience: 5,
      previous_deployments: 6,
      location: 'Mysore, Karnataka',
      pan_number: 'AAAAA1003A',
      cin_number: 'U72900KA2023PTC100003',
      gstin: '29AAAAA1003A1Z3',
      dpiit_number: 'DIPP100003'
    },
    {
      name: 'Startup4',
      email: 'startup4@setugov.in',
      phone: '+91 9811000004',
      company_name: 'Startup4 SmartCity Mobility',
      description: 'AI-driven emergency ambulance dispatch corridor and real-time public transit scheduling.',
      domain: 'Smart Cities',
      technologies: ['Smart Mobility', 'GPS Telematics', 'AI Routing', 'Edge Computing'],
      readiness_level: 7,
      years_experience: 4,
      previous_deployments: 3,
      location: 'Hubli, Karnataka',
      pan_number: 'AAAAA1004A',
      cin_number: 'U72900KA2023PTC100004',
      gstin: '29AAAAA1004A1Z4',
      dpiit_number: 'DIPP100004'
    },
    {
      name: 'Startup5',
      email: 'startup5@setugov.in',
      phone: '+91 9811000005',
      company_name: 'Startup5 CyberShield Labs',
      description: 'Zero-trust identity federation, cryptographic boundary isolation, and GovTech audit trail verification.',
      domain: 'Cybersecurity',
      technologies: ['Zero Trust', 'Cryptographic Auditing', 'SIEM Integration', 'Threat Modeling'],
      readiness_level: 9,
      years_experience: 6,
      previous_deployments: 8,
      location: 'Bangalore, Karnataka',
      pan_number: 'AAAAA1005A',
      cin_number: 'U72900KA2023PTC100005',
      gstin: '29AAAAA1005A1Z5',
      dpiit_number: 'DIPP100005'
    }
  ],
  evaluator: [
    {
      name: 'Evaluator1',
      email: 'evaluator1@setugov.in',
      phone: '+91 9822000001',
      organization: 'Indian Institute of Science (IISc)',
      designation: 'Principal AI Scientist & Professor',
      employment_type: 'FULL_TIME',
      years_experience: 14,
      domain_expertise: ['Healthcare Systems', 'AI & Machine Learning', 'Clinical Algorithms'],
      bio: 'Expert in clinical machine learning and national health mission computational pilots.'
    },
    {
      name: 'Evaluator2',
      email: 'evaluator2@setugov.in',
      phone: '+91 9822000002',
      organization: 'IIT Delhi - Tech Assessment Board',
      designation: 'Professor of Cyber-Physical Systems',
      employment_type: 'FULL_TIME',
      years_experience: 12,
      domain_expertise: ['IoT Systems', 'Smart Cities', 'Sensor Networks', 'Edge AI'],
      bio: 'Senior evaluator for state procurement and hardware-software sensor integrations.'
    },
    {
      name: 'Evaluator3',
      email: 'evaluator3@setugov.in',
      phone: '+91 9822000003',
      organization: 'National Informatics Centre (NIC)',
      designation: 'Senior Technical Director',
      employment_type: 'FULL_TIME',
      years_experience: 16,
      domain_expertise: ['Cybersecurity', 'Cloud Infrastructure', 'GovTech Data Boundary', 'ABDM'],
      bio: 'Oversight on government cloud architecture, interoperability, and data security.'
    },
    {
      name: 'Evaluator4',
      email: 'evaluator4@setugov.in',
      phone: '+91 9822000004',
      organization: 'NITI Aayog Innovation Mission',
      designation: 'Lead Procurement & Scalability Specialist',
      employment_type: 'FULL_TIME',
      years_experience: 10,
      domain_expertise: ['Public Procurement', 'Economic Viability', 'Scale Architecture', 'Outcome KPIs'],
      bio: 'Specialist in pilot-to-scale transition viability and procurement risk frameworks.'
    },
    {
      name: 'Evaluator5',
      email: 'evaluator5@setugov.in',
      phone: '+91 9822000005',
      organization: 'AIIMS - Digital Health Mission',
      designation: 'Head of Clinical Digital Protocols',
      employment_type: 'FULL_TIME',
      years_experience: 15,
      domain_expertise: ['Telemedicine', 'ABDM Integration', 'Hospital Information Systems', 'FHIR'],
      bio: 'Assesses digital health clinical workflows and public hospital adoption metrics.'
    }
  ],
  admin: [
    { name: 'Admin1', email: 'admin1@setugov.in', designation: 'State Innovation Lead Administrator', phone: '+91 9833000001' },
    { name: 'Admin2', email: 'admin2@setugov.in', designation: 'System & Security Governance Lead', phone: '+91 9833000002' },
    { name: 'Admin3', email: 'admin3@setugov.in', designation: 'Chief Compliance & Statutory Auditor', phone: '+91 9833000003' },
    { name: 'Admin4', email: 'admin4@setugov.in', designation: 'Procurement Oversight Administrator', phone: '+91 9833000004' },
    { name: 'Admin5', email: 'admin5@setugov.in', designation: 'Platform Operations & Evaluator Lead', phone: '+91 9833000005' },
  ]
};

export async function seedTestUsers() {
  logger.info('🚀 Seeding 20 Test Users (5 per role: Govt 1-5, Startup 1-5, Evaluator 1-5, Admin 1-5)...');

  const password_hash = await bcrypt.hash(testUsersConfig.password, 10);

  // 1. Ensure required Department exists for Government users
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
  }

  // 2. Seed Government Users (Govt1 - Govt5)
  logger.info('Creating 5 Government Test Users (Govt1 - Govt5)...');
  for (const gov of testUsersConfig.government) {
    await prisma.user.upsert({
      where: { email: gov.email },
      update: {
        name: gov.name,
        password_hash,
        role: 'GOVERNMENT',
        department_id: healthDept.id,
        designation: gov.designation,
        phone: gov.phone,
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0,
        locked_until: null
      },
      create: {
        name: gov.name,
        email: gov.email,
        password_hash,
        role: 'GOVERNMENT',
        department_id: healthDept.id,
        designation: gov.designation,
        phone: gov.phone,
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0
      }
    });
  }

  // 3. Seed Startup Users (Startup1 - Startup5)
  logger.info('Creating 5 Startup Test Users (Startup1 - Startup5) with verified profiles...');
  for (const st of testUsersConfig.startup) {
    const startupUser = await prisma.user.upsert({
      where: { email: st.email },
      update: {
        name: st.name,
        password_hash,
        role: 'STARTUP',
        phone: st.phone,
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0,
        locked_until: null
      },
      create: {
        name: st.name,
        email: st.email,
        password_hash,
        role: 'STARTUP',
        phone: st.phone,
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0
      }
    });

    // Upsert Startup Company Profile
    let startupRecord = await prisma.startup.findFirst({
      where: { user_id: startupUser.id }
    });

    const startupData = {
      user_id: startupUser.id,
      company_name: st.company_name,
      description: st.description,
      domain: st.domain,
      technologies: st.technologies,
      readiness_level: st.readiness_level,
      years_experience: st.years_experience,
      previous_deployments: st.previous_deployments,
      location: st.location,
      verification_status: 'VERIFIED',
      org_type: 'PRIVATE_LIMITED',
      pan_number: st.pan_number,
      cin_number: st.cin_number,
      gstin: st.gstin,
      dpiit_number: st.dpiit_number,
      official_email: st.email,
      authorized_person_name: st.name,
      authorized_person_designation: 'Founder & CEO',
      authorized_person_email: st.email,
      authorized_person_phone: st.phone
    };

    if (!startupRecord) {
      startupRecord = await prisma.startup.create({ data: startupData });
    } else {
      startupRecord = await prisma.startup.update({
        where: { id: startupRecord.id },
        data: startupData
      });
    }

    // Ensure Startup Bank Details exist
    await prisma.startupBankDetails.upsert({
      where: { startup_id: startupRecord.id },
      update: {
        account_holder_name: st.company_name,
        bank_name: 'State Bank of India',
        account_number: `10000000000${st.name.slice(-1)}`,
        ifsc_code: 'SBIN0001234',
        branch_name: 'Koramangala, Bangalore',
        account_type: 'CURRENT'
      },
      create: {
        startup_id: startupRecord.id,
        account_holder_name: st.company_name,
        bank_name: 'State Bank of India',
        account_number: `10000000000${st.name.slice(-1)}`,
        ifsc_code: 'SBIN0001234',
        branch_name: 'Koramangala, Bangalore',
        account_type: 'CURRENT'
      }
    });
  }

  // 4. Seed Evaluator Users (Evaluator1 - Evaluator5)
  logger.info('Creating 5 Evaluator Test Users (Evaluator1 - Evaluator5) with verified profiles...');
  for (const ev of testUsersConfig.evaluator) {
    const evalUser = await prisma.user.upsert({
      where: { email: ev.email },
      update: {
        name: ev.name,
        password_hash,
        role: 'EVALUATOR',
        phone: ev.phone,
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0,
        locked_until: null
      },
      create: {
        name: ev.name,
        email: ev.email,
        password_hash,
        role: 'EVALUATOR',
        phone: ev.phone,
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0
      }
    });

    await prisma.evaluatorProfile.upsert({
      where: { user_id: evalUser.id },
      update: {
        organization: ev.organization,
        designation: ev.designation,
        employment_type: ev.employment_type,
        years_experience: ev.years_experience,
        domain_expertise: ev.domain_expertise,
        bio: ev.bio,
        verification_status: 'VERIFIED'
      },
      create: {
        user_id: evalUser.id,
        organization: ev.organization,
        designation: ev.designation,
        employment_type: ev.employment_type,
        years_experience: ev.years_experience,
        domain_expertise: ev.domain_expertise,
        bio: ev.bio,
        verification_status: 'VERIFIED'
      }
    });
  }

  // 5. Seed Admin Users (Admin1 - Admin5)
  logger.info('Creating 5 Admin Test Users (Admin1 - Admin5)...');
  for (const ad of testUsersConfig.admin) {
    await prisma.user.upsert({
      where: { email: ad.email },
      update: {
        name: ad.name,
        password_hash,
        role: 'ADMIN',
        designation: ad.designation,
        phone: ad.phone,
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0,
        locked_until: null
      },
      create: {
        name: ad.name,
        email: ad.email,
        password_hash,
        role: 'ADMIN',
        designation: ad.designation,
        phone: ad.phone,
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0
      }
    });
  }

  logger.info('✅ Successfully seeded all 20 test users across the 4 roles!');
  logger.info('====================================================');
  logger.info('🔑 All accounts have password: Password123!');
  logger.info('📋 GOVERNMENT:  govt1@setugov.in to govt5@setugov.in');
  logger.info('📋 STARTUP:     startup1@setugov.in to startup5@setugov.in');
  logger.info('📋 EVALUATOR:   evaluator1@setugov.in to evaluator5@setugov.in');
  logger.info('📋 ADMIN:       admin1@setugov.in to admin5@setugov.in');
  logger.info('====================================================');
}

// Allow direct execution
if (process.argv[1]?.endsWith('seedTestUsers.js')) {
  seedTestUsers()
    .catch((err) => {
      logger.error('❌ Failed to seed test users:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
