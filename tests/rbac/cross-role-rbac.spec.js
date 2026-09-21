import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Cross-Role RBAC & Boundary Enforcement', () => {
  let challengeId, s1AppId, s2AppId;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    // 1. Govt 1 creates and publishes a Challenge
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const createRes = await request.post(`${config.backendUrl}/api/v1/challenges`, {
      headers: govt1Auth.authHeader,
      data: {
        title: `Cross Role Security Challenge ${timestamp}`,
        problem_description: 'Validating RBAC boundaries and tenant security across departments.',
        current_process: 'Standard.',
        current_baseline: '100.',
        desired_outcome: '20.',
        location: 'Bangalore Health HQ',
        budget_min: 500000,
        budget_max: 1000000,
        pilot_duration_days: 60,
        required_technologies: ['AI Queue Management'],
      },
    });
    expect(createRes.status()).toBe(201);
    const cData = await createRes.json();
    challengeId = cData.data?.challenge?.id || cData.data?.id;

    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/publish`, {
      headers: govt1Auth.authHeader,
    });

    // 2. Startup 1 applies
    const s1Auth = await loginViaAPI(request, config.startup1.email, config.startup1.password);
    const s1Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s1Auth.authHeader,
      data: {
        proposal: 'Startup 1 Confidential Proposal',
        technical_approach: 'Proprietary IP and architecture',
        expected_impact: 'High',
        estimated_cost: 600000,
        timeline: '30 days',
      },
    });
    const s1Data = await s1Res.json();
    s1AppId = s1Data.data?.application?.id || s1Data.data?.id;

    // 3. Startup 2 applies
    const s2Auth = await loginViaAPI(request, config.startup2.email, config.startup2.password);
    const s2Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s2Auth.authHeader,
      data: {
        proposal: 'Startup 2 Confidential Proposal',
        technical_approach: 'Proprietary IP and architecture 2',
        expected_impact: 'High',
        estimated_cost: 700000,
        timeline: '30 days',
      },
    });
    const s2Data = await s2Res.json();
    s2AppId = s2Data.data?.application?.id || s2Data.data?.id;
  });

  test('Startup 1 CANNOT access Startup 2 application (403 Forbidden)', async ({ request }) => {
    const s1Auth = await loginViaAPI(request, config.startup1.email, config.startup1.password);

    const crossAccessRes = await request.get(`${config.backendUrl}/api/v1/applications/${s2AppId}`, {
      headers: s1Auth.authHeader,
    });
    expect(crossAccessRes.status()).toBe(403);
  });

  test('Startup 2 CANNOT access Startup 1 application (403 Forbidden)', async ({ request }) => {
    const s2Auth = await loginViaAPI(request, config.startup2.email, config.startup2.password);

    const crossAccessRes = await request.get(`${config.backendUrl}/api/v1/applications/${s1AppId}`, {
      headers: s2Auth.authHeader,
    });
    expect(crossAccessRes.status()).toBe(403);
  });

  test('Government 2 CANNOT view applications for Government 1 challenge (403 Forbidden)', async ({ request }) => {
    const govt2Auth = await loginViaAPI(request, config.govt2.email, config.govt2.password);

    const crossGovtRes = await request.get(`${config.backendUrl}/api/v1/applications/${s1AppId}`, {
      headers: govt2Auth.authHeader,
    });
    expect(crossGovtRes.status()).toBe(403);
  });

  test('Evaluator CANNOT view unassigned application (403 Forbidden)', async ({ request }) => {
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);

    const unassignedRes = await request.get(`${config.backendUrl}/api/v1/applications/${s1AppId}`, {
      headers: ev1Auth.authHeader,
    });
    expect(unassignedRes.status()).toBe(403);
  });

  test('Evaluator CANNOT evaluate an application they were not assigned to (403 Forbidden)', async ({ request }) => {
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);

    const unassignedEvalRes = await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/evaluations`, {
      headers: ev1Auth.authHeader,
      data: {
        technical_score: 90,
        innovation_score: 85,
        impact_score: 90,
        scalability_score: 85,
        cost_score: 85,
        comments: 'Attempting evaluation without assignment.',
      },
    });
    expect(unassignedEvalRes.status()).toBe(403);
  });

  test('Manipulating UUID in URL to random ID fails gracefully with 404 Not Found', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const res = await request.get(`${config.backendUrl}/api/v1/challenges/${nonExistentId}`, {
      headers: govt1Auth.authHeader,
    });
    expect(res.status()).toBe(404);
  });
});
