import { prisma } from '../Backend/src/config/prisma.js';

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, {
    ...options,
    headers
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

async function login(email, password = 'Password123!') {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res.status !== 200 || !res.data?.data?.token) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.data.token;
}

async function runTests() {
  console.log('================================================================');
  console.log('SETUGOV SPECIFIC VERIFICATION: ISSUE 1 & ISSUE 2');
  console.log('================================================================\n');

  // Ensure unverified startup user exists for TEST 6
  let unverifiedUser = await prisma.user.findUnique({
    where: { email: 'unverified_startup_test@setugov.in' }
  });
  if (!unverifiedUser) {
    const sampleUser = await prisma.user.findFirst({ where: { email: 'startup1@setugov.in' } });
    unverifiedUser = await prisma.user.create({
      data: {
        email: 'unverified_startup_test@setugov.in',
        password_hash: sampleUser.password_hash,
        name: 'Unverified Test Founder',
        role: 'STARTUP'
      }
    });
  }
  let unverifiedStartup = await prisma.startup.findFirst({
    where: { user_id: unverifiedUser.id }
  });
  if (!unverifiedStartup) {
    unverifiedStartup = await prisma.startup.create({
      data: {
        user_id: unverifiedUser.id,
        company_name: 'Unverified Test Innovations Pvt Ltd',
        description: 'Unverified test startup for validation testing',
        domain: 'HEALTHCARE',
        technologies: ['AI/ML'],
        location: 'New Delhi',
        verification_status: 'PENDING'
      }
    });
  } else if (unverifiedStartup.verification_status === 'VERIFIED') {
    await prisma.startup.update({
      where: { id: unverifiedStartup.id },
      data: { verification_status: 'PENDING' }
    });
  }

  // 1. Authenticate tokens
  const govtAToken = await login('govt1@setugov.in');
  const govtBToken = await login('govt2@setugov.in');
  const startupToken = await login('startup1@setugov.in');
  const unverifiedToken = await login('unverified_startup_test@setugov.in');
  const adminToken = await login('admin@setugov.in');

  console.log('✓ All authentication tokens acquired.');

  const results = {};

  // =========================================================================
  // TEST 1: Govt Dept A creates challenge A. Govt Dept A sees it; Govt Dept B cannot.
  // =========================================================================
  console.log('\n--- EXECUTING TEST 1 ---');
  const uniqueCodeA = Date.now().toString().slice(-6);
  const titleA = `Dept A Challenge Test ${uniqueCodeA} AI Diagnostic Framework`;
  
  const createARes = await request('/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${govtAToken}` },
    body: JSON.stringify({
      title: titleA,
      problem_description: 'Standardized automated framework for regional healthcare diagnostics and tele-consultation infrastructure.',
      current_baseline: 'Manual triage and delays in patient record consolidation across rural health centers.',
      desired_outcome: 'Automate test triage and cut processing delays across 50 primary clinics.',
      location: 'Lucknow, Uttar Pradesh',
      budget_min: 500000,
      budget_max: 2000000,
      pilot_duration_days: 90,
      required_technologies: ['AI/ML', 'Cloud', 'Telehealth']
    })
  });
  console.log(`[TEST 1] Govt Dept A create challenge response: HTTP ${createARes.status}`);
  if (createARes.status !== 201) {
    throw new Error(`Failed to create Challenge A: ${JSON.stringify(createARes.data)}`);
  }
  const challengeA = createARes.data.data.challenge;
  const challengeAId = challengeA.id;

  // Publish Challenge A so it is PUBLISHED
  const pubARes = await request(`/challenges/${challengeAId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${govtAToken}` }
  });
  console.log(`[TEST 1] Govt Dept A publish challenge A response: HTTP ${pubARes.status}`);

  // Govt Dept A lists challenges
  const listA_DeptA = await request('/challenges', {
    headers: { Authorization: `Bearer ${govtAToken}` }
  });
  const deptAHasA = listA_DeptA.data?.data?.challenges?.some(c => c.id === challengeAId);

  // Govt Dept B lists challenges
  const listA_DeptB = await request('/challenges', {
    headers: { Authorization: `Bearer ${govtBToken}` }
  });
  const deptBHasA = listA_DeptB.data?.data?.challenges?.some(c => c.id === challengeAId);

  console.log(`[TEST 1] Govt Dept A can see Challenge A: ${deptAHasA}`);
  console.log(`[TEST 1] Govt Dept B cannot see Challenge A: ${!deptBHasA} (Dept B sees challenge A: ${deptBHasA})`);
  
  results.test1 = {
    pass: deptAHasA && !deptBHasA,
    challengeAId,
    deptAHasA,
    deptBHasA,
    apiResponseCreate: createARes.status,
    apiResponsePublish: pubARes.status
  };

  // =========================================================================
  // TEST 2: Govt Dept B creates challenge B. Govt Dept A cannot see challenge B.
  // =========================================================================
  console.log('\n--- EXECUTING TEST 2 ---');
  const uniqueCodeB = Date.now().toString().slice(-6);
  const titleB = `Dept B Challenge Test ${uniqueCodeB} Crop Yield Remote Sensing`;

  const createBRes = await request('/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${govtBToken}` },
    body: JSON.stringify({
      title: titleB,
      problem_description: 'Satellite and IoT based remote sensing for soil moisture telemetry and predictive crop yield forecasting.',
      current_baseline: 'Manual periodic soil sampling with two-week reporting delays.',
      desired_outcome: 'Increase precision yield accuracy by 35% for regional district cooperatives.',
      location: 'Nagpur, Maharashtra',
      budget_min: 750000,
      budget_max: 2500000,
      pilot_duration_days: 120,
      required_technologies: ['IoT', 'Remote Sensing', 'Data Analytics']
    })
  });
  console.log(`[TEST 2] Govt Dept B create challenge response: HTTP ${createBRes.status}`);
  if (createBRes.status !== 201) {
    throw new Error(`Failed to create Challenge B: ${JSON.stringify(createBRes.data)}`);
  }
  const challengeB = createBRes.data.data.challenge;
  const challengeBId = challengeB.id;

  // Publish Challenge B
  const pubBRes = await request(`/challenges/${challengeBId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${govtBToken}` }
  });
  console.log(`[TEST 2] Govt Dept B publish challenge B response: HTTP ${pubBRes.status}`);

  // Govt Dept B lists challenges
  const listB_DeptB = await request('/challenges', {
    headers: { Authorization: `Bearer ${govtBToken}` }
  });
  const deptBHasB = listB_DeptB.data?.data?.challenges?.some(c => c.id === challengeBId);

  // Govt Dept A lists challenges
  const listB_DeptA = await request('/challenges', {
    headers: { Authorization: `Bearer ${govtAToken}` }
  });
  const deptAHasB = listB_DeptA.data?.data?.challenges?.some(c => c.id === challengeBId);

  console.log(`[TEST 2] Govt Dept B can see Challenge B: ${deptBHasB}`);
  console.log(`[TEST 2] Govt Dept A cannot see Challenge B: ${!deptAHasB} (Dept A sees challenge B: ${deptAHasB})`);

  results.test2 = {
    pass: deptBHasB && !deptAHasB,
    challengeBId,
    deptBHasB,
    deptAHasB,
    apiResponseCreate: createBRes.status,
    apiResponsePublish: pubBRes.status
  };

  // =========================================================================
  // TEST 3: Startup can see both published challenge A and challenge B.
  // =========================================================================
  console.log('\n--- EXECUTING TEST 3 ---');
  const listStartup = await request('/challenges', {
    headers: { Authorization: `Bearer ${startupToken}` }
  });
  const startupHasA = listStartup.data?.data?.challenges?.some(c => c.id === challengeAId);
  const startupHasB = listStartup.data?.data?.challenges?.some(c => c.id === challengeBId);

  console.log(`[TEST 3] Startup sees published Challenge A: ${startupHasA}`);
  console.log(`[TEST 3] Startup sees published Challenge B: ${startupHasB}`);

  results.test3 = {
    pass: startupHasA && startupHasB,
    startupHasA,
    startupHasB,
    apiResponseList: listStartup.status,
    totalChallengesVisibleToStartup: listStartup.data?.data?.challenges?.length
  };

  // =========================================================================
  // TEST 4: Startup opens challenge A and GET /challenges/:id succeeds.
  // =========================================================================
  console.log('\n--- EXECUTING TEST 4 ---');
  const getStartupA = await request(`/challenges/${challengeAId}`, {
    headers: { Authorization: `Bearer ${startupToken}` }
  });
  console.log(`[TEST 4] Startup GET /challenges/${challengeAId} status: HTTP ${getStartupA.status}`);
  const test4Pass = getStartupA.status === 200 && getStartupA.data?.data?.challenge?.id === challengeAId;

  results.test4 = {
    pass: test4Pass,
    apiResponse: getStartupA.status,
    challengeTitle: getStartupA.data?.data?.challenge?.title
  };

  // =========================================================================
  // TEST 5: Verified Startup submits application for challenge A.
  // POST /challenges/:id/applications returns HTTP 201.
  // Application exists in DB with correct fields.
  // =========================================================================
  console.log('\n--- EXECUTING TEST 5 ---');
  const appPayload = {
    proposal: 'Automated AI Telehealth Diagnostic and Triage Gateway with Edge Computing',
    proposal_summary: 'Automated AI Telehealth Diagnostic and Triage Gateway with Edge Computing',
    technical_approach: 'High-throughput computer vision pipeline deployed in on-premise district clinics with HL7 FHIR compliance',
    expected_impact: 'Reduces test processing times by 65% across 40 remote community health centers',
    proposed_budget: 950000,
    estimated_cost: 950000,
    proposed_timeline_days: 75,
    timeline: '75 days',
    team_experience: 'Over 8 years building digital healthcare infrastructure for state health ministries'
  };

  const submitAppRes = await request(`/challenges/${challengeAId}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${startupToken}` },
    body: JSON.stringify(appPayload)
  });

  console.log(`[TEST 5] Startup submit application response: HTTP ${submitAppRes.status}`);
  const createdAppId = submitAppRes.data?.data?.application?.id;
  console.log(`[TEST 5] Created Application ID: ${createdAppId}`);

  // Query DB directly using Prisma
  const dbApp = await prisma.application.findUnique({
    where: { id: createdAppId },
    include: { startup: true }
  });

  const appVerification = {
    existsInDB: Boolean(dbApp),
    challengeIdMatches: dbApp?.challenge_id === challengeAId,
    startupIdMatches: Boolean(dbApp?.startup_id),
    proposalMatches: dbApp?.proposal === appPayload.proposal,
    technicalApproachMatches: dbApp?.technical_approach === appPayload.technical_approach,
    expectedImpactMatches: dbApp?.expected_impact === appPayload.expected_impact,
    estimatedCostMatches: Number(dbApp?.estimated_cost) === appPayload.estimated_cost,
    timelineMatches: dbApp?.timeline === appPayload.timeline,
    statusMatches: dbApp?.status === 'SUBMITTED'
  };

  console.log('[TEST 5] Database Application row verification:', appVerification);

  const test5Pass = submitAppRes.status === 201 &&
    Object.values(appVerification).every(val => val === true);

  results.test5 = {
    pass: test5Pass,
    apiResponse: submitAppRes.status,
    appId: createdAppId,
    verification: appVerification,
    dbRecord: dbApp ? {
      id: dbApp.id,
      challenge_id: dbApp.challenge_id,
      startup_id: dbApp.startup_id,
      proposal: dbApp.proposal,
      technical_approach: dbApp.technical_approach,
      expected_impact: dbApp.expected_impact,
      estimated_cost: dbApp.estimated_cost,
      timeline: dbApp.timeline,
      status: dbApp.status
    } : null
  };

  // =========================================================================
  // TEST 6: Unverified Startup is rejected by the existing verification rule.
  // =========================================================================
  console.log('\n--- EXECUTING TEST 6 ---');
  const unverifiedAppRes = await request(`/challenges/${challengeAId}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${unverifiedToken}` },
    body: JSON.stringify(appPayload)
  });
  console.log(`[TEST 6] Unverified startup submit application status: HTTP ${unverifiedAppRes.status}`);
  console.log(`[TEST 6] Message: ${unverifiedAppRes.data?.message}`);

  const test6Pass = unverifiedAppRes.status === 403 &&
    unverifiedAppRes.data?.message?.toLowerCase().includes('not verified');

  results.test6 = {
    pass: test6Pass,
    apiResponse: unverifiedAppRes.status,
    message: unverifiedAppRes.data?.message
  };

  // =========================================================================
  // TEST 7: Government cannot access another department's challenge detail directly by ID.
  // =========================================================================
  console.log('\n--- EXECUTING TEST 7 ---');
  // Govt B tries to open Challenge A (Dept A)
  const govtB_opens_A = await request(`/challenges/${challengeAId}`, {
    headers: { Authorization: `Bearer ${govtBToken}` }
  });
  console.log(`[TEST 7] Govt Dept B opens Challenge A (Dept A): HTTP ${govtB_opens_A.status}`);
  console.log(`[TEST 7] Error Message: ${govtB_opens_A.data?.message}`);

  // Govt A tries to open Challenge B (Dept B)
  const govtA_opens_B = await request(`/challenges/${challengeBId}`, {
    headers: { Authorization: `Bearer ${govtAToken}` }
  });
  console.log(`[TEST 7] Govt Dept A opens Challenge B (Dept B): HTTP ${govtA_opens_B.status}`);

  const test7Pass = govtB_opens_A.status === 403 && govtA_opens_B.status === 403;

  results.test7 = {
    pass: test7Pass,
    govtB_opens_A_status: govtB_opens_A.status,
    govtA_opens_B_status: govtA_opens_B.status,
    message: govtB_opens_A.data?.message
  };

  // =========================================================================
  // TEST 8: Admin can still access all challenges.
  // =========================================================================
  console.log('\n--- EXECUTING TEST 8 ---');
  const adminGetA = await request(`/challenges/${challengeAId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminGetB = await request(`/challenges/${challengeBId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminList = await request('/challenges', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  const adminHasA = adminList.data?.data?.challenges?.some(c => c.id === challengeAId);
  const adminHasB = adminList.data?.data?.challenges?.some(c => c.id === challengeBId);

  console.log(`[TEST 8] Admin GET Challenge A: HTTP ${adminGetA.status}`);
  console.log(`[TEST 8] Admin GET Challenge B: HTTP ${adminGetB.status}`);
  console.log(`[TEST 8] Admin lists Challenge A: ${adminHasA}, Challenge B: ${adminHasB}`);

  const test8Pass = adminGetA.status === 200 && adminGetB.status === 200 && adminHasA && adminHasB;

  results.test8 = {
    pass: test8Pass,
    adminGetA_status: adminGetA.status,
    adminGetB_status: adminGetB.status,
    adminHasA,
    adminHasB
  };

  console.log('\n================================================================');
  console.log('SUMMARY OF ALL 8 TESTS:');
  console.log('================================================================');
  for (let i = 1; i <= 8; i++) {
    const key = `test${i}`;
    console.log(`TEST ${i}: ${results[key].pass ? 'PASS' : 'FAIL'}`);
  }

  return results;
}

runTests()
  .then((results) => {
    console.log('\nTest suite execution completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nTest suite error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
