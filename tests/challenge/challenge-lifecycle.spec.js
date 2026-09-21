import { test, expect } from '@playwright/test';
import { loginViaUI, loginViaAPI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Government Challenge Lifecycle (Draft, Validation, Publication, Isolation)', () => {
  let challengeId;
  const timestamp = Date.now();
  const challengeTitle = `Hospital Triage AI System ${timestamp}`;

  test('Required-field validation blocks challenge creation when fields are empty', async ({ page }) => {
    // 1. Login as Government 1
    await loginViaUI(page, config.govt1.email, config.govt1.password, /\/government\/dashboard/);

    // 2. Navigate to Create Challenge
    await page.goto('/government/challenges/new');
    await expect(page.locator('#title')).toBeVisible();

    // 3. Attempt to continue without filling mandatory fields
    await page.locator('button:has-text("Continue")').click();

    // Verify validation messages appear
    await expect(page.locator('text=Challenge title is required.')).toBeVisible();
    await expect(page.locator('text=Department is required.')).toBeVisible();
    await expect(page.locator('text=Location is required.')).toBeVisible();
    await expect(page.locator('text=Problem description is required.')).toBeVisible();
    await expect(page.locator('text=Current process is required.')).toBeVisible();
    await expect(page.locator('text=Current baseline is required.')).toBeVisible();

    // Verify we remain on Step 1
    expect(page.url()).toContain('/challenges/new');
  });

  test('Create challenge with valid data, save as DRAFT, and verify reopening', async ({ page }) => {
    await loginViaUI(page, config.govt1.email, config.govt1.password, /\/government\/dashboard/);
    await page.goto('/government/challenges/new');

    // Step 1
    await page.locator('#title').fill(challengeTitle);
    await page.locator('#department').fill('Department of Health & Family Welfare');
    await page.locator('#location').fill('Victoria Hospital, Bangalore');
    await page.locator('#problemDescription').fill('Extreme clinical triage delays and patient congestion.');
    await page.locator('#currentProcess').fill('Manual paper triage by nursing staff.');
    await page.locator('#currentBaseline').fill('60 minutes average triage assessment delay.');
    await page.locator('button:has-text("Continue")').click();

    // Step 2
    await expect(page.locator('#desiredOutcome')).toBeVisible();
    await page.locator('#desiredOutcome').fill('Reduce triage assessment time to under 10 minutes.');
    await page.locator('#add-kpi-button').click();
    const kpiNameInput = page.locator('#kpis-section input[id*="name"], #kpis-section input[placeholder*="Indicator" i]').first();
    await kpiNameInput.fill('Average Triage Duration');
    await page.locator('button:has-text("Continue")').click();

    // Step 3
    await expect(page.locator('#startup')).toBeVisible();
    await page.locator('#startup').fill('Health AI Technologies');
    await page.locator('#pilotLocation').fill('Victoria Hospital Emergency Wing');
    await page.locator('#pilotStartDate').fill('2026-10-01');
    await page.locator('#pilotEndDate').fill('2026-12-01');
    await page.locator('#budget').fill('2000000');

    await page.locator('#add-milestone-button').click();
    const mNameInput = page.locator('#milestones-section input[id$="_name"]').first();
    const mDueInput = page.locator('#milestones-section input[id$="_dueDate"]').first();
    const mPctInput = page.locator('#milestones-section input[id$="_paymentPercentage"]').first();
    await mNameInput.fill('Initial Camera Deployment');
    await mDueInput.fill('2026-10-31');
    await mPctInput.fill('100');

    await page.locator('button:has-text("Continue")').click();

    // Step 4
    await expect(page.locator('button:has-text("Add Technology")')).toBeVisible();
    await page.locator('button:has-text("Add Technology")').click();
    const techInput = page.locator('input[placeholder*="technology" i], input[placeholder*="e.g." i]').first();
    await techInput.fill('AI Queue Management');
    await page.locator('button:has-text("Continue")').click();

    // Step 5 Review & Save Draft
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible();
    await page.locator('button:has-text("Save Draft")').click();

    // Wait for save confirmation
    await expect(page.locator('text=Draft saved successfully').or(page.locator('text=successfully'))).toBeVisible({ timeout: 10000 });

    // Navigate to Government challenges list and verify challenge appears with DRAFT status
    await page.goto('/government/challenges');
    const challengeRow = page.locator(`text=${challengeTitle}`).first();
    await expect(challengeRow).toBeVisible();

    // Reopen/edit draft
    await challengeRow.click();
    await expect(page.locator('text=DRAFT')).toBeVisible();
  });

  test('Publish Challenge and verify no automatic downstream records created', async ({ page, request }) => {
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);

    // Create a challenge via API to ensure a clean published test fixture
    const pubTitle = `Published OPD Challenge ${Date.now()}`;
    const createRes = await request.post(`${config.backendUrl}/api/v1/challenges`, {
      headers: govt1Auth.authHeader,
      data: {
        title: pubTitle,
        problem_description: 'Automated triage and waiting time reduction at major hospitals.',
        current_process: 'Paper token queue system.',
        current_baseline: '120 min wait time.',
        desired_outcome: '30 min wait time.',
        location: 'Bangalore General Hospital',
        budget_min: 1000000,
        budget_max: 2500000,
        pilot_duration_days: 60,
        required_technologies: ['AI Queue Management', 'Computer Vision'],
      },
    });
    expect(createRes.status()).toBe(201);
    const createData = await createRes.json();
    challengeId = createData.data?.challenge?.id || createData.data?.id;

    // Publish via API
    await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/publish`, {
      headers: govt1Auth.authHeader,
    });

    // Login as Government 1 and verify published challenge in UI
    await loginViaUI(page, config.govt1.email, config.govt1.password, /\/government\/dashboard/);
    await page.goto(`/government/challenges/${challengeId}/overview`);

    // Verify status is PUBLISHED in UI
    await expect(page.locator('text=PUBLISHED').first()).toBeVisible();

    // Verify that publishing did NOT automatically create downstream records
    const checkRes = await request.get(`${config.backendUrl}/api/v1/challenges/${challengeId}`, {
      headers: govt1Auth.authHeader,
    });
    const checkData = await checkRes.json();
    const ch = checkData.data?.challenge || checkData.data;

    expect(ch.status).toBe('PUBLISHED');
    // Verify no evaluators automatically assigned
    expect(ch._count?.evaluator_assignments || 0).toBe(0);
    expect(ch._count?.applications || 0).toBe(0);
    expect(ch._count?.pilots || 0).toBe(0);

    // Verify invalid status transitions are rejected
    // PUBLISHED -> PILOT must fail
    const invalidPilotTransition = await request.patch(`${config.backendUrl}/api/v1/challenges/${challengeId}`, {
      headers: govt1Auth.authHeader,
      data: { status: 'PILOT' },
    });
    // Should return 400 Bad Request
    expect(invalidPilotTransition.status()).toBe(400);

    // Verify arbitrary edit of immutable fields after publication fails
    const invalidUpdate = await request.patch(`${config.backendUrl}/api/v1/challenges/${challengeId}`, {
      headers: govt1Auth.authHeader,
      data: { title: 'Arbitrary Title Manipulation After Publish' },
    });
    // Procurement integrity: Cannot modify non-draft challenge
    expect(invalidUpdate.status()).toBe(400);
  });
});
