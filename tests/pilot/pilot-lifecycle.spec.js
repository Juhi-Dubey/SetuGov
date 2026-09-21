import { test, expect } from '@playwright/test';
import { loginViaAPI, loginViaUI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Pilot Creation & Lifecycle', () => {
  let challengeId, s1AppId, s3AppId;
  let s1StartupId, s3StartupId;
  let pilotId;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    // 1. Create and publish Challenge
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const createRes = await request.post(`${config.backendUrl}/api/v1/challenges`, {
      headers: govt1Auth.authHeader,
      data: {
        title: `Pilot Deployment Challenge ${timestamp}`,
        problem_description: 'Hospital OPD deployment pilot testing and monitoring.',
        current_process: 'Legacy queue tokens.',
        current_baseline: '110 min wait time.',
        desired_outcome: '20 min wait time.',
        location: 'Victoria Hospital, Bangalore',
        budget_min: 1000000,
        budget_max: 2000000,
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

    // 2. Startup 1 applies
    const s1Auth = await loginViaAPI(request, config.startup1.email, config.startup1.password);
    const s1Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s1Auth.authHeader,
      data: {
        proposal: 'AI Hospital Pilot Proposal',
        technical_approach: 'Edge AI camera installation',
        expected_impact: '75% wait reduction',
        estimated_cost: 1500000,
        timeline: '60 days',
      },
    });
    const s1Data = await s1Res.json();
    s1AppId = s1Data.data?.application?.id || s1Data.data?.id;
    s1StartupId = s1Data.data?.application?.startup_id || s1Data.data?.startup_id;

    // 3. Startup 3 applies (ineligible)
    const s3Auth = await loginViaAPI(request, config.startup3.email, config.startup3.password);
    const s3Res = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/applications`, {
      headers: s3Auth.authHeader,
      data: {
        proposal: 'Sanitation Robotics Pilot',
        technical_approach: 'Robotic cleaning',
        expected_impact: 'Hygiene compliance',
        estimated_cost: 1800000,
        timeline: '60 days',
      },
    });
    const s3Data = await s3Res.json();
    s3AppId = s3Data.data?.application?.id || s3Data.data?.id;
    s3StartupId = s3Data.data?.application?.startup_id || s3Data.data?.startup_id;

    // 4. Evaluator pool and evaluations for Startup 1
    const ev1Auth = await loginViaAPI(request, config.evaluator1.email, config.evaluator1.password);
    const ev2Auth = await loginViaAPI(request, config.evaluator2.email, config.evaluator2.password);

    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: ev1Auth.user.id },
    });
    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: ev2Auth.user.id },
    });

    const a1 = await (await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: ev1Auth.user.id },
    })).json();
    const a2 = await (await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      headers: govt1Auth.authHeader,
      data: { evaluator_id: ev2Auth.user.id },
    })).json();

    const a1Id = a1.data?.assignment?.id || a1.data?.id;
    const a2Id = a2.data?.assignment?.id || a2.data?.id;

    await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${a1Id}/status`, {
      headers: ev1Auth.authHeader,
      data: { status: 'ACCEPTED' },
    });
    await request.patch(`${config.backendUrl}/api/v1/evaluators/assignments/${a2Id}/status`, {
      headers: ev2Auth.authHeader,
      data: { status: 'ACCEPTED' },
    });

    await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      headers: ev1Auth.authHeader,
      data: { has_conflict: false },
    });
    await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      headers: ev2Auth.authHeader,
      data: { has_conflict: false },
    });

    await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/evaluations`, {
      headers: ev1Auth.authHeader,
      data: { technical_score: 90, innovation_score: 85, impact_score: 90, scalability_score: 85, cost_score: 85, comments: 'Pass', is_draft: false },
    });
    await request.post(`${config.backendUrl}/api/v1/applications/${s1AppId}/evaluations`, {
      headers: ev2Auth.authHeader,
      data: { technical_score: 88, innovation_score: 85, impact_score: 85, scalability_score: 80, cost_score: 80, comments: 'Pass', is_draft: false },
    });

    // 5. Select Startup 1
    await request.patch(`${config.backendUrl}/api/v1/applications/${s1AppId}/status`, {
      headers: govt1Auth.authHeader,
      data: { status: 'SELECTED', reason: 'Consensus winner' },
    });
  });

  test('Create Pilot for SELECTED Startup 1 succeeds with PLANNED status', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);

    const pilotRes = await request.post(`${config.backendUrl}/api/v1/pilots`, {
      headers: govt1Auth.authHeader,
      data: {
        challenge_id: challengeId,
        startup_id: s1StartupId,
        location: 'Victoria Hospital Emergency Wing, Bangalore',
        start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        budget: 1500000,
      },
    });

    expect(pilotRes.status()).toBe(201);
    const pilotData = await pilotRes.json();
    const pilot = pilotData.data?.pilot || pilotData.data;
    expect(pilot.status).toBe('PLANNED');
    expect(pilot.challenge_id).toBe(challengeId);
    expect(pilot.startup_id).toBe(s1StartupId);
    pilotId = pilot.id;

    // Verify Challenge status transitioned to PILOT
    const chRes = await request.get(`${config.backendUrl}/api/v1/challenges/${challengeId}`, {
      headers: govt1Auth.authHeader,
    });
    const chData = await chRes.json();
    const ch = chData.data?.challenge || chData.data;
    expect(ch.status).toBe('PILOT');
  });

  test('Ineligible / unselected Startup 3 CANNOT enter Pilot workflow', async ({ request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);

    // Attempt to create Pilot for Startup 3
    const invalidPilotRes = await request.post(`${config.backendUrl}/api/v1/pilots`, {
      headers: govt1Auth.authHeader,
      data: {
        challenge_id: challengeId,
        startup_id: s3StartupId,
        location: 'Victoria Hospital Ward',
        start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        budget: 1800000,
      },
    });

    // Must be rejected with 400 Bad Request
    expect(invalidPilotRes.status()).toBe(400);
    const errData = await invalidPilotRes.json();
    expect(errData.message).toContain('SELECTED');
  });

  test('Startup 1 can view their active Pilot via UI', async ({ page }) => {
    await loginViaUI(page, config.startup1.email, config.startup1.password, /\/startup\/dashboard/);
    await page.goto('/startup/pilots');
    await expect(page.locator('h1, h2, div')).toContainText(/Pilot/i);
  });
});
