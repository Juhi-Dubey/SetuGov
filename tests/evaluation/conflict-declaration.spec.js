import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Conflict of Interest Declaration (No Conflict vs Conflict & Recusal)', () => {
  let challengeId, s1AppId, s2AppId;
  let evaluator1Id, evaluator2Id;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    // 1. Create and publish Challenge
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const createRes = await request.post(`${config.backendUrl}/api/v1/challenges`, {
      headers: govt1Auth.authHeader,
      data: {
        title: `COI Verification Challenge ${timestamp}`,
        problem_description: 'Testing COI governance lifecycle in emergency ward triage.',
        current_process: 'Standard queue triage.',
        current_baseline: '120 min wait time.',
        desired_outcome: '25 min wait time.',
        location: 'Bangalore Hospital',
        budget_min: 1000000,
        budget_max: 2500000,
        pilot_duration_days: 60,
        required_technologies: ['AI Queue Management', 'Telemedicine'],
      },
    });
    expect(createRes.status()).toBe(201);
    const cData = await createRes.json();
    challengeId = cData.data?.challenge?.id || cData.data?.id;

    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/publish`, {
      headers: govt1Auth.authHeader,
    });
    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/start-evaluation`, {
      headers: govt1Auth.authHeader,
    });

    // 2. Startup 1 & 2 apply
    const s1Auth = await loginViaAPI(request, config.startup1.email, config.startup1.password);
    const s1Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s1Auth.authHeader,
      data: {
        proposal: 'AI Queue Solution',
        technical_approach: 'Computer Vision & AI queue prioritization',
        expected_impact: 'Cut wait time by 75%',
        estimated_cost: 1500000,
        timeline: '30 days',
      },
    });
    const s1Data = await s1Res.json();
    s1AppId = s1Data.data?.application?.id || s1Data.data?.id;

    const s2Auth = await loginViaAPI(request, config.startup2.email, config.startup2.password);
    const s2Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s2Auth.authHeader,
      data: {
        proposal: 'Telehealth Kiosk Solution',
        technical_approach: 'Remote health kiosks & IoT sensors',
        expected_impact: 'Cut wait time by 50%',
        estimated_cost: 1400000,
        timeline: '30 days',
      },
    });
    const s2Data = await s2Res.json();
    s2AppId = s2Data.data?.application?.id || s2Data.data?.id;

    // Evaluators
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);
    evaluator1Id = ev1Auth.user.id;
    const ev2Auth = await loginViaAPI(request, config.evaluator2.email, config.evaluator2.password);
    evaluator2Id = ev2Auth.user.id;

    // Add to pool
    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator1Id },
    });
    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator2Id },
    });
  });

  test('NO CONFLICT: Evaluator accepts -> NO CONFLICT declared -> Can evaluate', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);

    // Assign Evaluator 1 to Startup 1
    const assignRes = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator1Id },
    });
    const aData = await assignRes.json();
    const assignmentId = aData.data?.assignment?.id || aData.data?.id;

    // Accept assignment
    await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${assignmentId}/status`, {
      headers: ev1Auth.authHeader,
      data: { status: 'ACCEPTED' },
    });

    // Declare NO CONFLICT
    const coiRes = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      headers: ev1Auth.authHeader,
      data: {
        has_conflict: false,
        conflict_details: null,
      },
    });
    expect(coiRes.status()).toBe(200);

    // Submit evaluation successfully
    const evalRes = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/evaluations`, {
      headers: ev1Auth.authHeader,
      data: {
        technical_score: 90,
        innovation_score: 85,
        impact_score: 90,
        scalability_score: 80,
        cost_score: 85,
        comments: 'Outstanding proposal with solid clinical feasibility and ABDM integration.',
        is_draft: false,
      },
    });
    expect(evalRes.status()).toBe(201);
  });

  test('CONFLICT: Evaluator accepts -> CONFLICT declared -> Assignment RECUSED -> Cannot evaluate -> Government assigns replacement', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const ev2Auth = await loginViaAPI(request, config.evaluator2.email, config.evaluator2.password);
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);

    // Assign Evaluator 2 to Startup 2
    const assignRes = await request.post(`${config.backendUrl}/api/v1/applications/${s2AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator2Id },
    });
    const aData = await assignRes.json();
    const assignmentId = aData.data?.assignment?.id || aData.data?.id;

    // Evaluator 2 accepts assignment
    await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${assignmentId}/status`, {
      headers: ev2Auth.authHeader,
      data: { status: 'ACCEPTED' },
    });

    // Evaluator 2 declares CONFLICT
    const coiRes = await request.post(`${config.backendUrl}/api/v1/applications/${s2AppId}/conflict-declaration`, {
      headers: ev2Auth.authHeader,
      data: {
        has_conflict: true,
        conflict_details: 'Personal advisory relationship and equity ownership in applicant startup entity.',
        is_recused: true,
      },
    });
    expect(coiRes.status()).toBe(200);

    // Verify Evaluator 2 cannot submit evaluation (fails with 403 Forbidden)
    const evalRes = await request.post(`${config.backendUrl}/api/v1/applications/${s2AppId}/evaluations`, {
      headers: ev2Auth.authHeader,
      data: {
        technical_score: 80,
        innovation_score: 80,
        impact_score: 80,
        scalability_score: 80,
        cost_score: 80,
        comments: 'Attempting evaluation despite conflict of interest.',
        is_draft: false,
      },
    });
    expect(evalRes.status()).toBe(403);

    // Government assigns replacement evaluator (Evaluator 1)
    const replaceRes = await request.post(`${config.backendUrl}/api/v1/applications/${s2AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator1Id },
    });
    expect(replaceRes.status()).toBe(201);
  });
});
