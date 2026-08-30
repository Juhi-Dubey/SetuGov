import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma.js';
import { generateMockEmbedding } from '../src/utils/vector.js';
import { calculateTotalScore } from '../src/services/evaluationService.js';
import { logger } from '../src/utils/logger.js';

const seedDatabase = async () => {
  logger.info('🌱 Starting SetuGov Database Seeding...');

  // Clear existing database tables in proper order
  logger.info('Cleaning old records...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.scaleDecision.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.validation.deleteMany({});
  await prisma.risk.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.pilotMeasurement.deleteMany({});
  await prisma.pilotKpi.deleteMany({});
  await prisma.pilot.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.matchScore.deleteMany({});
  await prisma.startupDocument.deleteMany({});
  await prisma.startup.deleteMany({});
  await prisma.challenge.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  const defaultPassword = 'Password123!';
  const password_hash = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed Departments
  logger.info('Creating Departments...');
  const healthDept = await prisma.department.create({
    data: {
      name: 'Department of Health & Family Welfare',
      state: 'Karnataka',
      contact_email: 'health.kar@gov.in'
    }
  });

  const transportDept = await prisma.department.create({
    data: {
      name: 'Department of Urban Mobility & Transport',
      state: 'Karnataka',
      contact_email: 'mobility.kar@gov.in'
    }
  });

  // 2. Seed Users
  logger.info('Creating Users...');
  // 1 Admin
  const adminUser = await prisma.user.create({
    data: {
      name: 'Priya Sharma (State Innovation Officer)',
      email: 'admin@setugov.in',
      password_hash,
      role: 'ADMIN',
      is_active: true
    }
  });

  // 2 Government Users
  const govUser1 = await prisma.user.create({
    data: {
      name: 'Dr. Ramesh Kumar (Director of Health)',
      email: 'ramesh.kumar@health.gov.in',
      password_hash,
      role: 'GOVERNMENT',
      department_id: healthDept.id,
      is_active: true
    }
  });

  const govUser2 = await prisma.user.create({
    data: {
      name: 'Suresh Patil (Joint Director, Urban Transport)',
      email: 'suresh.patil@transport.gov.in',
      password_hash,
      role: 'GOVERNMENT',
      department_id: transportDept.id,
      is_active: true
    }
  });

  // 3 Evaluators
  const evalUser1 = await prisma.user.create({
    data: {
      name: 'Dr. Anita Desai (Healthcare Systems Specialist)',
      email: 'anita.desai@evaluators.setugov.in',
      password_hash,
      role: 'EVALUATOR',
      is_active: true
    }
  });

  const evalUser2 = await prisma.user.create({
    data: {
      name: 'Prof. Rajesh Iyer (AI & Computer Vision Expert, IISc)',
      email: 'rajesh.iyer@evaluators.setugov.in',
      password_hash,
      role: 'EVALUATOR',
      is_active: true
    }
  });

  const evalUser3 = await prisma.user.create({
    data: {
      name: 'Sunita Rao (Public Procurement & Financial Analyst)',
      email: 'sunita.rao@evaluators.setugov.in',
      password_hash,
      role: 'EVALUATOR',
      is_active: true
    }
  });

  // 5 Startup Users & Startups
  logger.info('Creating 5 Startups...');
  const startupDefs = [
    {
      user: { name: 'Vikas Sharma', email: 'vikas@mediqueue.ai' },
      startup: {
        company_name: 'MediQueue AI Technologies Pvt Ltd',
        description: 'Next-generation hospital OPD queue optimization, automated token dispensing, real-time wait estimation using computer vision, and ABHA/FHIR integration.',
        domain: 'Healthcare',
        technologies: ['AI Queue Management', 'Computer Vision', 'FHIR / ABDM API', 'Predictive Analytics', 'React Native'],
        readiness_level: 8,
        years_experience: 4,
        previous_deployments: 5,
        location: 'Bangalore, Karnataka',
        verification_status: 'VERIFIED'
      }
    },
    {
      user: { name: 'Ananya Roy', email: 'ananya@cliniflow.io' },
      startup: {
        company_name: 'CliniFlow Health Systems',
        description: 'Cloud-based hospital workflow orchestration with automated triage priority scoring and smart doctor scheduling.',
        domain: 'Healthcare',
        technologies: ['Predictive Analytics', 'Cloud API', 'Python', 'PostgreSQL'],
        readiness_level: 7,
        years_experience: 3,
        previous_deployments: 2,
        location: 'Mysore, Karnataka',
        verification_status: 'VERIFIED'
      }
    },
    {
      user: { name: 'Rahul Varma', email: 'rahul@triagebot.tech' },
      startup: {
        company_name: 'TriageBot AI',
        description: 'Conversational WhatsApp and voice bots for remote hospital appointment booking, preliminary triage, and queue notification.',
        domain: 'Healthcare',
        technologies: ['NLP / LLM', 'Voice AI', 'WhatsApp Business API'],
        readiness_level: 6,
        years_experience: 2,
        previous_deployments: 1,
        location: 'Hubli, Karnataka',
        verification_status: 'VERIFIED'
      }
    },
    {
      user: { name: 'Kavita Nair', email: 'kavita@urbansignal.io' },
      startup: {
        company_name: 'UrbanSignal Traffic Solutions',
        description: 'Adaptive traffic signal control and emergency vehicle green corridor management using edge AI cameras.',
        domain: 'Urban Mobility',
        technologies: ['Computer Vision', 'IoT Edge', 'Traffic Flow Simulation'],
        readiness_level: 8,
        years_experience: 5,
        previous_deployments: 4,
        location: 'Bangalore, Karnataka',
        verification_status: 'VERIFIED'
      }
    },
    {
      user: { name: 'Deepak Joshi', email: 'deepak@earlymed.co' },
      startup: {
        company_name: 'EarlyMed Healthtech (Early Stage)',
        description: 'Prototyping automated kiosk devices for rural primary healthcare centers.',
        domain: 'Healthcare',
        technologies: ['IoT Hardware', 'Embedded C'],
        readiness_level: 4,
        years_experience: 1,
        previous_deployments: 0,
        location: 'Mangalore, Karnataka',
        verification_status: 'PENDING'
      }
    }
  ];

  const createdStartups = [];

  for (const sDef of startupDefs) {
    const sUser = await prisma.user.create({
      data: {
        name: sDef.user.name,
        email: sDef.user.email,
        password_hash,
        role: 'STARTUP',
        is_active: true
      }
    });

    const sEmbedding = generateMockEmbedding(
      `${sDef.startup.company_name} ${sDef.startup.domain} ${sDef.startup.description} ${sDef.startup.technologies.join(' ')}`
    );

    const sStartup = await prisma.startup.create({
      data: {
        user_id: sUser.id,
        company_name: sDef.startup.company_name,
        description: sDef.startup.description,
        domain: sDef.startup.domain,
        technologies: sDef.startup.technologies,
        readiness_level: sDef.startup.readiness_level,
        years_experience: sDef.startup.years_experience,
        previous_deployments: sDef.startup.previous_deployments,
        verification_status: sDef.startup.verification_status,
        location: sDef.startup.location,
        embedding: sEmbedding
      }
    });

    // Add Document
    await prisma.startupDocument.create({
      data: {
        startup_id: sStartup.id,
        document_type: 'DPIIT_CERTIFICATE',
        document_url: `https://storage.setugov.in/docs/${sStartup.id}-dpiit.pdf`,
        verification_status: sDef.startup.verification_status,
        verified_by: sDef.startup.verification_status === 'VERIFIED' ? govUser1.id : null,
        verified_at: sDef.startup.verification_status === 'VERIFIED' ? new Date() : null
      }
    });

    createdStartups.push({ user: sUser, startup: sStartup });
  }

  const selectedStartupInfo = createdStartups[0]; // MediQueue AI

  // 3. Create Main Demo Challenge: Hospital Waiting Time Reduction
  logger.info('Creating Demo Challenge: Hospital Waiting Time Reduction...');
  const challengeEmbedding = generateMockEmbedding(
    'Hospital Waiting Time Reduction Overcrowding in OPD triage and emergency registration AI Queue Management Computer Vision FHIR / ABDM API Predictive Analytics'
  );

  const demoChallenge = await prisma.challenge.create({
    data: {
      department_id: healthDept.id,
      title: 'Hospital Waiting Time Reduction',
      problem_description: 'Severe overcrowding in outpatient department (OPD) registration and triage at Victoria District Hospital, causing average patient waiting times of 90 minutes and significant administrative strain on medical staff.',
      current_baseline: 'Average OPD waiting time: 90 minutes per patient. High patient overcrowding and lack of queue predictability during peak hours (8 AM - 1 PM).',
      desired_outcome: 'Reduce average OPD wait time from 90 minutes to 60 minutes or less (>= 33% reduction), achieve >= 90% triage accuracy, and enable automated token generation with ABHA integration.',
      location: 'Victoria Hospital, Bangalore, Karnataka',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI Queue Management', 'Computer Vision', 'FHIR / ABDM API', 'Predictive Analytics'],
      status: 'PUBLISHED',
      created_by: govUser1.id,
      embedding: challengeEmbedding
    }
  });

  // 4. Seed Match Scores
  logger.info('Generating Match Scores for verified startups...');
  for (const s of createdStartups) {
    if (s.startup.verification_status === 'VERIFIED') {
      const isTop = s.startup.id === selectedStartupInfo.startup.id;
      await prisma.matchScore.create({
        data: {
          challenge_id: demoChallenge.id,
          startup_id: s.startup.id,
          technology_score: isTop ? 100 : (s.startup.domain === 'Healthcare' ? 75 : 30),
          domain_score: isTop ? 95 : (s.startup.domain === 'Healthcare' ? 80 : 35),
          readiness_score: Math.round((s.startup.readiness_level / 9) * 100),
          experience_score: Math.round((s.startup.years_experience / 5) * 100),
          deployment_score: Math.min(100, s.startup.previous_deployments * 20),
          overall_score: isTop ? 88.5 : (s.startup.domain === 'Healthcare' ? 72.0 : 42.0),
          ai_reasoning: isTop
            ? 'Complete technical overlap on AI queue orchestration, computer vision, and ABDM APIs with strong hospital track record.'
            : 'Moderate alignment on predictive analytics and healthcare domain.'
        }
      });
    }
  }

  // 5. Seed Applications
  logger.info('Creating Applications...');
  const app1 = await prisma.application.create({
    data: {
      challenge_id: demoChallenge.id,
      startup_id: selectedStartupInfo.startup.id,
      proposal: 'Automated Hospital Queue Orchestration, Edge Camera Density Monitoring & Smart Token Kiosks for OPD.',
      technical_approach: 'Deploying lightweight AI cameras for queue length estimation, multi-lingual self-service touch kiosks with ABHA QR scanning, and doctor desk load balancer dashboard.',
      expected_impact: 'Targeting 40% reduction in patient waiting times (90 min -> 54 min), 93% triage routing accuracy, and real-time waiting display in waiting lounges.',
      estimated_cost: 380000,
      timeline: '60 days structured in three 20-day sprints: Sprint 1 (Setup), Sprint 2 (Go-Live), Sprint 3 (Validation).',
      status: 'SELECTED',
      submitted_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000)
    }
  });

  const app2 = await prisma.application.create({
    data: {
      challenge_id: demoChallenge.id,
      startup_id: createdStartups[1].startup.id, // CliniFlow
      proposal: 'Cloud-based Clinic Workflow & Appointment Scheduling Platform.',
      technical_approach: 'Web portal and SMS scheduling module for hospital doctors and staff.',
      expected_impact: 'Expected 25% reduction in wait time through prior booking.',
      estimated_cost: 350000,
      timeline: '60 days in 2 phases.',
      status: 'SHORTLISTED',
      submitted_at: new Date(Date.now() - 54 * 24 * 60 * 60 * 1000)
    }
  });

  // 6. Seed Evaluations
  logger.info('Creating Evaluations from 3 Evaluators...');
  const eval1Scores = { technical_score: 92, innovation_score: 88, impact_score: 95, scalability_score: 85, cost_score: 90 };
  await prisma.evaluation.create({
    data: {
      application_id: app1.id,
      evaluator_id: evalUser1.id,
      ...eval1Scores,
      total_score: calculateTotalScore(eval1Scores), // 90.85
      comments: 'Excellent technical architecture. High impact on reducing emergency bottleneck and very well thought out ABDM integration.'
    }
  });

  const eval2Scores = { technical_score: 90, innovation_score: 92, impact_score: 90, scalability_score: 90, cost_score: 85 };
  await prisma.evaluation.create({
    data: {
      application_id: app1.id,
      evaluator_id: evalUser2.id,
      ...eval2Scores,
      total_score: calculateTotalScore(eval2Scores), // 89.65
      comments: 'Edge computer vision queue estimation is state-of-the-art and privacy-preserving. Highly feasible.'
    }
  });

  const eval3Scores = { technical_score: 85, innovation_score: 85, impact_score: 92, scalability_score: 88, cost_score: 95 };
  await prisma.evaluation.create({
    data: {
      application_id: app1.id,
      evaluator_id: evalUser3.id,
      ...eval3Scores,
      total_score: calculateTotalScore(eval3Scores), // 88.95
      comments: 'Budget of ₹3,80,000 is realistic and cost-effective for a 60-day district hospital deployment.'
    }
  });

  // 7. Seed Pilot
  logger.info('Creating Pilot for Selected Startup (MediQueue AI)...');
  const pilotStartDate = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000); // 50 days ago
  const pilotEndDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);   // 10 days remaining

  const demoPilot = await prisma.pilot.create({
    data: {
      challenge_id: demoChallenge.id,
      startup_id: selectedStartupInfo.startup.id,
      location: 'Victoria Hospital OPD, Bangalore',
      start_date: pilotStartDate,
      end_date: pilotEndDate,
      budget: 380000,
      status: 'VALIDATION',
      overall_score: 93.4,
      final_recommendation: 'Outstanding performance across all KPIs. Waiting time reduced from 90 to 54 mins. Recommended for statewide procurement and scaling.'
    }
  });

  // 8. Seed 5 KPIs & Measurements (Scenario Target vs Actual)
  logger.info('Creating 5 Pilot KPIs & Measurement Time-Series...');
  const kpisData = [
    {
      name: 'Average OPD Waiting Time',
      description: 'Average time spent by patient from arrival/token generation to doctor consultation.',
      unit: 'minutes',
      baseline_value: 90,
      target_value: 60,
      actual_value: 54, // Target beaten! (54 mins)
      weight: 2.0,
      measurements: [
        { day: 10, value: 82, source: 'Kiosk Logs' },
        { day: 20, value: 74, source: 'Edge Vision + Kiosk' },
        { day: 35, value: 63, source: 'Hospital HMS API' },
        { day: 48, value: 54, source: 'Audit Measurement' }
      ]
    },
    {
      name: 'Triage Routing Accuracy',
      description: 'Percentage of patients accurately dispatched to appropriate specialty department without re-routing.',
      unit: '%',
      baseline_value: 68,
      target_value: 90,
      actual_value: 93.5,
      weight: 1.5,
      measurements: [
        { day: 15, value: 78, source: 'Doctor Feedback' },
        { day: 30, value: 89, source: 'Triage System Logs' },
        { day: 45, value: 93.5, source: 'Supervisory Audit' }
      ]
    },
    {
      name: 'Doctor Slot Utilization',
      description: 'Average utilization rate of available doctor consultation hours without idle gaps.',
      unit: '%',
      baseline_value: 55,
      target_value: 80,
      actual_value: 84.0,
      weight: 1.0,
      measurements: [
        { day: 15, value: 65, source: 'HMS Consultation Counter' },
        { day: 30, value: 79, source: 'HMS Consultation Counter' },
        { day: 45, value: 84, source: 'HMS Consultation Counter' }
      ]
    },
    {
      name: 'Digital Token / ABHA Adoption',
      description: 'Percentage of incoming patients using digital kiosks or ABHA scan-and-share.',
      unit: '%',
      baseline_value: 0,
      target_value: 75,
      actual_value: 82.0,
      weight: 1.0,
      measurements: [
        { day: 10, value: 35, source: 'Kiosk Telemetry' },
        { day: 25, value: 68, source: 'Kiosk Telemetry' },
        { day: 45, value: 82, source: 'Kiosk Telemetry' }
      ]
    },
    {
      name: 'Patient Satisfaction Rating',
      description: 'Patient satisfaction score from exit terminal feedback kiosks (Scale 1 to 5).',
      unit: 'Score / 5',
      baseline_value: 2.8,
      target_value: 4.2,
      actual_value: 4.5,
      weight: 1.0,
      measurements: [
        { day: 15, value: 3.4, source: 'Exit Feedback Kiosk' },
        { day: 30, value: 4.1, source: 'Exit Feedback Kiosk' },
        { day: 45, value: 4.5, source: 'Exit Feedback Kiosk' }
      ]
    }
  ];

  for (const kpiDef of kpisData) {
    const createdKpi = await prisma.pilotKpi.create({
      data: {
        pilot_id: demoPilot.id,
        name: kpiDef.name,
        description: kpiDef.description,
        unit: kpiDef.unit,
        baseline_value: kpiDef.baseline_value,
        target_value: kpiDef.target_value,
        actual_value: kpiDef.actual_value,
        weight: kpiDef.weight,
        status: 'ACTIVE'
      }
    });

    for (const m of kpiDef.measurements) {
      const measurementDate = new Date(pilotStartDate.getTime() + m.day * 24 * 60 * 60 * 1000);
      await prisma.pilotMeasurement.create({
        data: {
          pilot_id: demoPilot.id,
          kpi_id: createdKpi.id,
          measurement_date: measurementDate,
          value: m.value,
          source: m.source,
          verified: true
        }
      });
    }
  }

  // 9. Seed Milestones & Payments
  logger.info('Creating Milestones & Payments...');
  const m1 = await prisma.milestone.create({
    data: {
      pilot_id: demoPilot.id,
      name: 'Milestone 1: Hardware Setup & Kiosk Deployment',
      description: 'Installation of 4 touch kiosks, 6 queue cameras, and local edge servers at Victoria Hospital.',
      due_date: new Date(pilotStartDate.getTime() + 15 * 24 * 60 * 60 * 1000),
      completion_percentage: 100,
      payment_percentage: 30,
      status: 'COMPLETED',
      evidence_url: 'https://storage.setugov.in/pilots/victoria/m1-installation-signoff.pdf'
    }
  });

  const m2 = await prisma.milestone.create({
    data: {
      pilot_id: demoPilot.id,
      name: 'Milestone 2: ABHA Integration & Staff Training',
      description: 'Integration with ABDM scan-and-share, training of 40 nurses and registration clerks.',
      due_date: new Date(pilotStartDate.getTime() + 35 * 24 * 60 * 60 * 1000),
      completion_percentage: 100,
      payment_percentage: 30,
      status: 'COMPLETED',
      evidence_url: 'https://storage.setugov.in/pilots/victoria/m2-training-signoff.pdf'
    }
  });

  const m3 = await prisma.milestone.create({
    data: {
      pilot_id: demoPilot.id,
      name: 'Milestone 3: Outcome Validation & Final Performance Report',
      description: 'Continuous queue optimization, 60-day outcome audit, and final scaling blueprint.',
      due_date: pilotEndDate,
      completion_percentage: 90,
      payment_percentage: 40,
      status: 'IN_PROGRESS',
      evidence_url: 'https://storage.setugov.in/pilots/victoria/m3-preliminary-audit.pdf'
    }
  });

  // Simulated Payments
  await prisma.payment.create({
    data: {
      pilot_id: demoPilot.id,
      milestone_id: m1.id,
      amount: 114000, // 30% of 380,000
      payment_percentage: 30,
      status: 'PAID',
      payment_date: new Date(pilotStartDate.getTime() + 16 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.payment.create({
    data: {
      pilot_id: demoPilot.id,
      milestone_id: m2.id,
      amount: 114000, // 30% of 380,000
      payment_percentage: 30,
      status: 'PAID',
      payment_date: new Date(pilotStartDate.getTime() + 36 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.payment.create({
    data: {
      pilot_id: demoPilot.id,
      milestone_id: m3.id,
      amount: 152000, // 40% of 380,000
      payment_percentage: 40,
      status: 'PENDING'
    }
  });

  // 10. Seed Evidence
  logger.info('Creating Evidence items...');
  await prisma.evidence.create({
    data: {
      pilot_id: demoPilot.id,
      type: 'METRICS_TELEMETRY',
      description: 'Automated 45-day anonymized patient wait time telemetry log exported directly from hospital edge gateways.',
      file_url: 'https://storage.setugov.in/pilots/victoria/wait_time_telemetry_45d.csv',
      source: 'Edge Gateway Telemetry',
      verification_status: 'VERIFIED',
      uploaded_by: selectedStartupInfo.user.id
    }
  });

  await prisma.evidence.create({
    data: {
      pilot_id: demoPilot.id,
      type: 'PATIENT_SURVEY',
      description: '500-respondent exit survey confirming 4.5/5 average satisfaction with the new token dispatch flow.',
      file_url: 'https://storage.setugov.in/pilots/victoria/patient_satisfaction_survey.pdf',
      source: 'Independent Quality Cell',
      verification_status: 'VERIFIED',
      uploaded_by: govUser1.id
    }
  });

  // 11. Seed Risks
  logger.info('Creating Pilot Risks...');
  await prisma.risk.create({
    data: {
      pilot_id: demoPilot.id,
      category: 'TECHNICAL',
      description: 'Potential hospital LAN network intermittency during peak morning hours.',
      severity: 'MEDIUM',
      mitigation: 'Configured local offline caching and dual 4G fallback routers in all 4 kiosks.',
      owner: 'MediQueue Technical Lead',
      status: 'MITIGATED'
    }
  });

  await prisma.risk.create({
    data: {
      pilot_id: demoPilot.id,
      category: 'OPERATIONAL',
      description: 'Elderly patients needing assistance with touchscreen interface.',
      severity: 'LOW',
      mitigation: "Stationed 2 dedicated hospital 'Arogya Mitra' volunteers near registration counters.",
      owner: 'Hospital OPD Superintendent',
      status: 'MITIGATED'
    }
  });

  // 12. Seed Validation Report
  logger.info('Creating Formal Validation Report...');
  await prisma.validation.create({
    data: {
      pilot_id: demoPilot.id,
      validator_id: evalUser1.id,
      performance_score: 95,
      kpi_achievement_score: 96,
      evidence_quality_score: 92,
      technical_stability_score: 90,
      user_satisfaction_score: 94,
      comments: 'Superb outcome. Waiting time dropped from 90 to 54 minutes. The solution is technically robust, staff-friendly, and complies with all state digital health standards.',
      status: 'VALIDATED'
    }
  });

  // 13. Seed Scale Decision
  logger.info('Creating Scale Decision...');
  await prisma.scaleDecision.create({
    data: {
      pilot_id: demoPilot.id,
      decision: 'SCALE',
      score: 93.4,
      reasoning: 'The pilot has definitively proven its capability by reducing OPD waiting time to 54 minutes (target was 60 minutes) with high patient and staff satisfaction. Approved for scaling across 5 district hospitals.',
      approved_by: govUser1.id,
      status: 'FINALIZED'
    }
  });

  // 14. Seed Notifications & Audit Logs
  logger.info('Creating Notifications and Audit Logs...');
  await prisma.notification.create({
    data: {
      user_id: govUser1.id,
      title: 'Pilot Milestone 2 Completed',
      message: 'MediQueue AI has successfully completed Milestone 2 with 100% staff training signoff.',
      type: 'SUCCESS',
      link: `/pilots/${demoPilot.id}/dashboard`
    }
  });

  await prisma.notification.create({
    data: {
      user_id: selectedStartupInfo.user.id,
      title: 'Validation Report Submitted',
      message: 'Your pilot at Victoria Hospital has been formally VALIDATED by the evaluation panel with a score of 93.4%.',
      type: 'SUCCESS',
      link: `/pilots/${demoPilot.id}/dashboard`
    }
  });

  await prisma.auditLog.create({
    data: {
      user_id: govUser1.id,
      action: 'PILOT_SCALE_DECISION_FINALIZED',
      entity_type: 'PILOT',
      entity_id: demoPilot.id,
      details: { decision: 'SCALE', score: 93.4, target_hospitals: 5 },
      ip_address: '127.0.0.1'
    }
  });

  logger.info('✅ SetuGov Database Seeding Completed Successfully!');
  logger.info('====================================================');
  logger.info('📊 Demo Accounts Credentials:');
  logger.info('  ADMIN:      admin@setugov.in / Password123!');
  logger.info('  GOVERNMENT: ramesh.kumar@health.gov.in / Password123!');
  logger.info('  EVALUATOR:  anita.desai@evaluators.setugov.in / Password123!');
  logger.info('  STARTUP:    vikas@mediqueue.ai / Password123!');
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
