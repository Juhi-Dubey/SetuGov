import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Three Startup Applications & Eligibility Screening', () => {
  let challengeId;
  let s1AppId, s2AppId, s3AppId;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    // 1. Create and publish a test challenge as Government 1
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const createRes = await request.post(`${config.backendUrl}/api/v1/challenges`, {
      headers: govt1Auth.authHeader,
      data: {
        title: `Hospital OPD Care Acceleration ${timestamp}`,
        problem_description: 'Overcrowded waiting rooms and emergency triage delays at public hospitals.',
        current_process: 'Manual queue cards and paper logs.',
        current_baseline: '150 min wait time.',
        desired_outcome: '30 min wait time with automated triage.',
        location: 'Victoria Hospital, Bangalore',
        budget_min: 1000000,
        budget_max: 2000000,
        pilot_duration_days: 60,
        required_technologies: ['ABDM'],
      },
    });
    expect(createRes.status()).toBe(201);
    const createData = await createRes.json();
    challengeId = createData.data?.challenge?.id || createData.data?.id;

    // Publish challenge
    const publishRes = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/publish`, {
      headers: govt1Auth.authHeader,
    });
    expect(publishRes.status()).toBe(200);
  });

  test('Startup 1, 2, and 3 apply to the Challenge through real API/UI workflow', async ({ request }) => {
    // 1. Startup 1 applies (Health AI Technologies, Healthcare, FHIR / ABDM API)
    const s1Auth = await loginViaAPI(request, config.startup1.email, config.startup1.password);
    const s1Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s1Auth.authHeader,
      data: {
        proposal: 'AI-driven hospital queue prioritization and predictive triage engine.',
        technical_approach: 'Deploy computer vision cameras and FHIR ABDM queue integration.',
        expected_impact: 'Reduce patient wait time from 150 to 25 minutes.',
        estimated_cost: 1500000,
        timeline: '45 days',
      },
    });
    expect(s1Res.status()).toBe(201);
    const s1Data = await s1Res.json();
    s1AppId = s1Data.data?.application?.id || s1Data.data?.id;
    expect(s1AppId).toBeDefined();

    // 2. Startup 2 applies (TeleHealth Labs, Healthcare, ABDM Gateway)
    const s2Auth = await loginViaAPI(request, config.startup2.email, config.startup2.password);
    const s2Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s2Auth.authHeader,
      data: {
        proposal: 'Remote ABDM-compliant tele-consultation kiosks for pre-OPD triage.',
        technical_approach: 'IoT vitals measurement and WebRTC tele-triage connection.',
        expected_impact: 'Divert 40% non-critical OPD cases to decentralized kiosks.',
        estimated_cost: 1200000,
        timeline: '40 days',
      },
    });
    expect(s2Res.status()).toBe(201);
    const s2Data = await s2Res.json();
    s2AppId = s2Data.data?.application?.id || s2Data.data?.id;
    expect(s2AppId).toBeDefined();

    // 3. Startup 3 applies (CleanGov Robotics, Sanitation domain - incompatible with Health)
    const s3Auth = await loginViaAPI(request, config.startup3.email, config.startup3.password);
    const s3Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s3Auth.authHeader,
      data: {
        proposal: 'Autonomous sanitation robots for hospital corridor disinfection.',
        technical_approach: 'LiDAR-guided robotic disinfection units.',
        expected_impact: 'Sterilize 10,000 sq ft hourly.',
        estimated_cost: 1800000,
        timeline: '60 days',
      },
    });
    expect(s3Res.status()).toBe(201);
    const s3Data = await s3Res.json();
    s3AppId = s3Data.data?.application?.id || s3Data.data?.id;
    expect(s3AppId).toBeDefined();

    // Verify all 3 applications belong to the correct challenge
    const govtAuth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const appsRes = await request.get(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: govtAuth.authHeader,
    });
    expect(appsRes.status()).toBe(200);
    const appsData = await appsRes.json();
    const apps = appsData.data?.applications || appsData.data || [];
    const appIds = apps.map((a) => a.id);

    expect(appIds).toContain(s1AppId);
    expect(appIds).toContain(s2AppId);
    expect(appIds).toContain(s3AppId);
  });

  test('Eligibility screening: Startup 1 & 2 are ELIGIBLE, Startup 3 is INELIGIBLE', async ({ request }) => {
    const govtAuth = await loginViaAPI(request, config.govt1.email, config.govt1.password);

    // Get eligibility evaluation via Challenge Eligibility endpoint
    const eligRes = await request.get(`${config.backendUrl}/api/v1/challenges/${challengeId}/eligibility`, {
      headers: govtAuth.authHeader,
    });
    expect(eligRes.status()).toBe(200);

    // Setup Evaluator in Final Pool to test evaluator assignment guard
    const evalUserAuth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);
    const evaluatorId = evalUserAuth.user.id;

    // Add Evaluator to pool
    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      headers: govtAuth.authHeader,
      data: {
        evaluator_id: evaluatorId,
        approve_needs_review: true,
        notes: 'Government verified expert for this challenge',
      },
    });

    // Verify: Ineligible Startup 3 CANNOT proceed to evaluator assignment
    const s3AssignRes = await request.post(`${config.backendUrl}/api/v1/applications/${s3AppId}/assign-evaluator`, {
      headers: govtAuth.authHeader,
      data: { evaluator_id: evaluatorId },
    });
    // Backend must reject with 400 Bad Request
    expect(s3AssignRes.status()).toBe(400);
    const s3AssignError = await s3AssignRes.json();
    expect(s3AssignError.message).toContain('ineligible');

    // Verify: Eligible Startup 1 CAN proceed to evaluator assignment
    const s1AssignRes = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      headers: govtAuth.authHeader,
      data: { evaluator_id: evaluatorId },
    });
    expect(s1AssignRes.status()).toBe(201);
  });
});
