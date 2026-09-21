import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Evaluation Lifecycle & Evaluator Assignment (Accept/Decline)', () => {
  let challengeId, s1AppId, s2AppId;
  let evaluator1Id, evaluator2Id;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    // 1. Government 1 creates and publishes a challenge
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const createRes = await request.post(`${config.backendUrl}/api/v1/challenges`, {
      headers: govt1Auth.authHeader,
      data: {
        title: `Clinical Triage AI Challenge ${timestamp}`,
        problem_description: 'Emergency ward patient overflow at public hospitals.',
        current_process: 'Physical triage paper notes.',
        current_baseline: '100 min waiting.',
        desired_outcome: '20 min waiting.',
        location: 'Victoria Hospital, Bangalore',
        budget_min: 1500000,
        budget_max: 3000000,
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

    // 2. Startup 1 & 2 apply
    const s1Auth = await loginViaAPI(request, config.startup1.email, config.startup1.password);
    const s1Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s1Auth.authHeader,
      data: {
        proposal: 'Predictive queue triage algorithms.',
        technical_approach: 'AI camera vision and real-time ABDM queue sorting.',
        expected_impact: '80% wait time cut.',
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
        proposal: 'Decentralized diagnostic kiosks.',
        technical_approach: 'IoT vitals measurement station.',
        expected_impact: '60% non-critical diversion.',
        estimated_cost: 1400000,
        timeline: '45 days',
      },
    });
    const s2Data = await s2Res.json();
    s2AppId = s2Data.data?.application?.id || s2Data.data?.id;

    // Get Evaluator IDs
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);
    evaluator1Id = ev1Auth.user.id;
    const ev2Auth = await loginViaAPI(request, config.evaluator2.email, config.evaluator2.password);
    evaluator2Id = ev2Auth.user.id;
  });

  test('Government explicitly moves challenge from PUBLISHED to EVALUATION', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);

    // Explicit government transition action
    const startEvalRes = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/start-evaluation`, {
      headers: govt1Auth.authHeader,
    });
    expect(startEvalRes.status()).toBe(200);

    // Verify challenge status is now EVALUATION
    const checkRes = await request.get(`${config.backendUrl}/api/v1/challenges/${challengeId}`, {
      headers: govt1Auth.authHeader,
    });
    const checkData = await checkRes.json();
    const ch = checkData.data?.challenge || checkData.data;
    expect(ch.status).toBe('EVALUATION');
  });

  test('Evaluator recommendations & pool curation (Government explicitly adds to pool)', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);

    // Get advisory recommendations
    const matchesRes = await request.get(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-matches`, {
      headers: govt1Auth.authHeader,
    });
    expect(matchesRes.status()).toBe(200);

    // Add Evaluator 1 and Evaluator 2 to the challenge pool
    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator1Id },
    });

    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator2Id },
    });

    // Verify pool has both evaluators
    const poolRes = await request.get(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      headers: govt1Auth.authHeader,
    });
    expect(poolRes.status()).toBe(200);
    const poolData = await poolRes.json();
    const pool = poolData.data?.pool || poolData.data || [];
    const poolEvaluatorIds = pool.map((p) => p.evaluator_id);
    expect(poolEvaluatorIds).toContain(evaluator1Id);
    expect(poolEvaluatorIds).toContain(evaluator2Id);
  });

  test('ACCEPT Flow: Government assigns evaluator -> PENDING -> evaluator accepts -> ACCEPTED', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);

    // Government assigns Evaluator 1 to Startup 1
    const assignRes = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator1Id },
    });
    expect(assignRes.status()).toBe(201);
    const assignData = await assignRes.json();
    const assignment = assignData.data?.assignment || assignData.data;
    expect(assignment.status).toBe('PENDING');
    const assignmentId = assignment.id;

    // Evaluator 1 accepts assignment
    const acceptRes = await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${assignmentId}/status`, {
      headers: ev1Auth.authHeader,
      data: { status: 'ACCEPTED' },
    });
    expect(acceptRes.status()).toBe(200);
    const acceptData = await acceptRes.json();
    const updatedAssignment = acceptData.data?.assignment || acceptData.data;
    expect(updatedAssignment.status).toBe('ACCEPTED');
  });

  test('DECLINE Flow: Government assigns evaluator -> PENDING -> evaluator declines -> DECLINED -> replace', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const ev2Auth = await loginViaAPI(request, config.evaluator2.email, config.evaluator2.password);
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);

    // Government assigns Evaluator 2 to Startup 2
    const assignRes = await request.post(`${config.backendUrl}/api/v1/applications/${s2AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator2Id },
    });
    expect(assignRes.status()).toBe(201);
    const assignData = await assignRes.json();
    const assignment = assignData.data?.assignment || assignData.data;
    expect(assignment.status).toBe('PENDING');
    const assignmentId = assignment.id;

    // Evaluator 2 declines assignment
    const declineRes = await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${assignmentId}/status`, {
      headers: ev2Auth.authHeader,
      data: { status: 'DECLINED', decline_reason: 'Schedule conflict with university academic review.' },
    });
    expect(declineRes.status()).toBe(200);
    const declineData = await declineRes.json();
    const updatedAssignment = declineData.data?.assignment || declineData.data;
    expect(updatedAssignment.status).toBe('DECLINED');

    // Government can assign replacement evaluator (Evaluator 1)
    const replaceRes = await request.post(`${config.backendUrl}/api/v1/applications/${s2AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: evaluator1Id },
    });
    expect(replaceRes.status()).toBe(201);
    const replaceData = await replaceRes.json();
    const replacementAssignment = replaceData.data?.assignment || replaceData.data;
    expect(replacementAssignment.status).toBe('PENDING');

    // Evaluator 1 accepts replacement assignment
    await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${replacementAssignment.id}/status`, {
      headers: ev1Auth.authHeader,
      data: { status: 'ACCEPTED' },
    });
  });
});
