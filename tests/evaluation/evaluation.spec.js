import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Proposal Evaluation & Government Selection', () => {
  let challengeId, s1AppId, s2AppId, s3AppId;
  let evaluator1Id, evaluator2Id;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    // 1. Create and publish Challenge
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const createRes = await request.post(`${config.backendUrl}/api/v1/challenges`, {
      headers: govt1Auth.authHeader,
      data: {
        title: `Full Evaluation & Selection Challenge ${timestamp}`,
        problem_description: 'Hospital emergency queue management system.',
        current_process: 'Physical queue tokens.',
        current_baseline: '120 min wait time.',
        desired_outcome: '25 min wait time.',
        location: 'Victoria Hospital, Bangalore',
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

    // 2. Startup 1, 2, 3 apply
    const s1Auth = await loginViaAPI(request, config.startup1.email, config.startup1.password);
    const s1Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s1Auth.authHeader,
      data: {
        proposal: 'AI Queue Prioritization',
        technical_approach: 'Computer Vision & Queue AI',
        expected_impact: '75% wait time reduction',
        estimated_cost: 1500000,
        timeline: '45 days',
      },
    });
    const s1Data = await s1Res.json();
    s1AppId = s1Data.data?.application?.id || s1Data.data?.id;

    const s2Auth = await loginViaAPI(request, config.startup2.email, config.startup2.password);
    const s2Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s2Auth.authHeader,
      data: {
        proposal: 'Decentralized Kiosks',
        technical_approach: 'Remote health monitoring kiosks',
        expected_impact: '50% diversion',
        estimated_cost: 1400000,
        timeline: '45 days',
      },
    });
    const s2Data = await s2Res.json();
    s2AppId = s2Data.data?.application?.id || s2Data.data?.id;

    const s3Auth = await loginViaAPI(request, config.startup3.email, config.startup3.password);
    const s3Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s3Auth.authHeader,
      data: {
        proposal: 'Sanitation Robotics',
        technical_approach: 'Autonomous hospital floor cleaners',
        expected_impact: 'Sanitation improvement',
        estimated_cost: 1800000,
        timeline: '60 days',
      },
    });
    const s3Data = await s3Res.json();
    s3AppId = s3Data.data?.application?.id || s3Data.data?.id;

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

  test('Complete 2-evaluator quorum for Startup 1 and verify Startup 3 cannot be evaluated', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);
    const ev2Auth = await loginViaAPI(request, config.evaluator2.email, config.evaluator2.password);

    // 1. Assign Evaluator 1 & 2 to Startup 1
    const a1Res = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator1Id },
    });
    const a1Id = (await a1Res.json()).data?.assignment?.id || (await a1Res.json()).data?.id;

    const a2Res = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator2Id },
    });
    const a2Id = (await a2Res.json()).data?.assignment?.id || (await a2Res.json()).data?.id;

    // Accept both assignments
    await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${a1Id}/status`, {
      headers: ev1Auth.authHeader,
      data: { status: 'ACCEPTED' },
    });
    await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${a2Id}/status`, {
      headers: ev2Auth.authHeader,
      data: { status: 'ACCEPTED' },
    });

    // Submit NO CONFLICT declarations
    await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      headers: ev1Auth.authHeader,
      data: { has_conflict: false },
    });
    await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      headers: ev2Auth.authHeader,
      data: { has_conflict: false },
    });

    // Evaluator 1 submits evaluation
    const eval1Res = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/evaluations`, {
      headers: ev1Auth.authHeader,
      data: {
        technical_score: 90,
        innovation_score: 85,
        impact_score: 90,
        scalability_score: 80,
        cost_score: 85,
        comments: 'High technical readiness, excellent alignment with OPD bottlenecks.',
        is_draft: false,
      },
    });
    expect(eval1Res.status()).toBe(201);

    // Evaluator 2 submits evaluation
    const eval2Res = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/evaluations`, {
      headers: ev2Auth.authHeader,
      data: {
        technical_score: 88,
        innovation_score: 82,
        impact_score: 85,
        scalability_score: 85,
        cost_score: 80,
        comments: 'Scalable architecture and clear compliance path.',
        is_draft: false,
      },
    });
    expect(eval2Res.status()).toBe(201);

    // Verify Startup 3 (ineligible) cannot be evaluated (fails)
    const s3EvalRes = await request.post(`${config.backendUrl}/api/v1/applications/${s3AppId}/evaluations`, {
      headers: ev1Auth.authHeader,
      data: {
        technical_score: 70,
        innovation_score: 70,
        impact_score: 70,
        scalability_score: 70,
        cost_score: 70,
        comments: 'Attempting evaluation of unassigned/ineligible startup.',
        is_draft: false,
      },
    });
    // Evaluator is not assigned to Startup 3 -> 403 Forbidden
    expect(s3EvalRes.status()).toBe(403);
  });

  test('Government explicitly selects evaluated Startup 1; ineligible Startup 3 cannot be selected', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);

    // Government reviews evaluation summary
    const summaryRes = await request.get(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluation-summary`, {
      headers: govt1Auth.authHeader,
    });
    expect(summaryRes.status()).toBe(200);

    // Government explicitly selects Startup 1
    const selectRes = await request.patch(`${config.backendUrl}/api/v1/applications/${s1AppId}/status`, {
      headers: govt1Auth.authHeader,
      data: {
        status: 'SELECTED',
        reason: 'Selected following consensus evaluation and meeting required quorum.',
      },
    });
    expect(selectRes.status()).toBe(200);
    const selectData = await selectRes.json();
    const updatedApp = selectData.data?.application || selectData.data;
    expect(updatedApp.status).toBe('SELECTED');

    // Verify ineligible Startup 3 CANNOT be selected (fails with 400 Bad Request)
    const s3SelectRes = await request.patch(`${config.backendUrl}/api/v1/applications/${s3AppId}/status`, {
      headers: govt1Auth.authHeader,
      data: {
        status: 'SELECTED',
        reason: 'Attempting to select ineligible startup.',
      },
    });
    expect(s3SelectRes.status()).toBe(400);
  });
});
