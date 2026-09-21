import { test, expect } from '@playwright/test';
import { loginViaUI, loginViaAPI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Government RBAC and Department Isolation', () => {
  let challengeId;
  let draftChallengeId;
  const timestamp = Date.now();
  const challengeTitle = `OPD Waiting Time Optimization ${timestamp}`;
  const draftTitle = `Internal Department Draft ${timestamp}`;

  test('Step 1-5: Government 1 creates DRAFT and publishes Challenge via UI', async ({ page }) => {
    // 1. Login as Government 1
    await loginViaUI(page, config.govt1.email, config.govt1.password, /\/government\/dashboard/);

    // 2. Create a new Challenge
    await page.goto('/government/challenges/new');
    await expect(page.locator('#title')).toBeVisible();

    // Step 1 Form
    await page.locator('#title').fill(challengeTitle);
    await page.locator('#department').fill('Department of Health & Family Welfare');
    await page.locator('#location').fill('District Hospital, Bangalore');
    await page.locator('#problemDescription').fill('Severe OPD bottlenecks causing patient wait times over 3 hours.');
    await page.locator('#currentProcess').fill('Manual queue tokens and manual paper registers.');
    await page.locator('#currentBaseline').fill('Average patient wait time: 180 minutes.');
    await page.locator('button:has-text("Continue")').click();

    // Step 2 Form
    await expect(page.locator('#desiredOutcome')).toBeVisible();
    await page.locator('#desiredOutcome').fill('Reduce patient wait times below 45 minutes using digital queue management.');
    await page.locator('#add-kpi-button').click();
    const kpiNameInput = page.locator('#kpis-section input[id*="name"], #kpis-section input[placeholder*="Indicator" i]').first();
    await kpiNameInput.fill('Average Wait Time');
    await page.locator('button:has-text("Continue")').click();

    // Step 3 Form
    await expect(page.locator('#startup')).toBeVisible();
    await page.locator('#startup').fill('Health AI Technologies');
    await page.locator('#pilotLocation').fill('District Hospital OPD Block');
    await page.locator('#pilotStartDate').fill('2026-10-01');
    await page.locator('#pilotEndDate').fill('2026-12-01');
    await page.locator('#budget').fill('1500000');

    await page.locator('#add-milestone-button').click();
    const mNameInput = page.locator('#milestones-section input[id$="_name"]').first();
    const mDueInput = page.locator('#milestones-section input[id$="_dueDate"]').first();
    const mPctInput = page.locator('#milestones-section input[id$="_paymentPercentage"]').first();
    await mNameInput.fill('Pilot Setup');
    await mDueInput.fill('2026-10-31');
    await mPctInput.fill('100');

    await page.locator('button:has-text("Continue")').click();

    // Step 4 Form
    await expect(page.locator('button:has-text("Add Technology")')).toBeVisible();
    await page.locator('button:has-text("Add Technology")').click();
    const techInput = page.locator('input[placeholder*="technology" i], input[placeholder*="e.g." i]').first();
    await techInput.fill('AI Queue Management');
    await page.locator('button:has-text("Continue")').click();

    // Step 5 Review Form
    await expect(page.locator('button:has-text("Publish Challenge")')).toBeVisible();

    // Save Draft first to verify draft saving
    const saveDraftBtn = page.locator('button:has-text("Save Draft")');
    await saveDraftBtn.click();

    // Wait for save message
    await expect(page.locator('text=Draft saved successfully').or(page.locator('text=successfully'))).toBeVisible({ timeout: 10000 });

    // Now Publish Challenge
    const publishBtn = page.locator('button:has-text("Publish Challenge")');
    await Promise.all([
      page.waitForURL(/\/government\/challenges\/[a-zA-Z0-9-]+\/overview/, { timeout: 15000 }),
      publishBtn.click(),
    ]);

    // Extract challenge ID from URL
    const url = page.url();
    const match = url.match(/\/government\/challenges\/([a-zA-Z0-9-]+)\/overview/);
    expect(match).not.toBeNull();
    challengeId = match[1];

    // Verify Government 1 can see and open the published challenge
    await expect(page.locator('text=PUBLISHED').first()).toBeVisible();
  });

  test('Step 6-8: Government 2 cannot modify or access Government 1 DRAFT challenge', async ({ page, request }) => {
    // Also create a strictly DRAFT challenge for Govt 1 via API to test cross-department DRAFT isolation
    const govt1Auth = await loginViaAPI(request, config.govt1.email, config.govt1.password);
    const govt2Auth = await loginViaAPI(request, config.govt2.email, config.govt2.password);

    const draftRes = await request.post(`${config.backendUrl}/api/v1/challenges`, {
      headers: govt1Auth.authHeader,
      data: {
        title: draftTitle,
        problem_description: 'Department internal confidential problem statement draft.',
        current_process: 'Internal legacy process.',
        current_baseline: 'Zero digital tracking.',
        desired_outcome: 'Modernized internal workflows.',
        location: 'Bangalore Health Dept HQ',
        budget_min: 500000,
        budget_max: 1000000,
        pilot_duration_days: 60,
        required_technologies: ['Healthcare AI'],
      },
    });
    expect(draftRes.status()).toBe(201);
    const draftData = await draftRes.json();
    draftChallengeId = draftData.data?.challenge?.id || draftData.data?.id;

    // Login as Government 2 via UI
    await loginViaUI(page, config.govt2.email, config.govt2.password, /\/government\/dashboard/);

    // Verify Govt 2 cannot see Government 1's DRAFT challenge in the challenges list
    await page.goto('/government/challenges');
    await expect(page.locator(`text=${draftTitle}`)).not.toBeVisible();

    // Step 9: Attempt to access Govt 1's DRAFT challenge through direct URL
    await page.goto(`/government/challenges/${draftChallengeId}/edit`);
    // Should show permission error or redirect away from edit
    await expect(page.locator('text=You do not have permission').or(page.locator('text=Forbidden')).or(page.locator('text=Error')).or(page.locator('text=not authorized'))).toBeVisible({ timeout: 10000 });

    // Step 10-11: Verify backend API returns 403 Forbidden for Government 2 accessing Govt 1's DRAFT challenge
    const getDraftRes = await request.get(`${config.backendUrl}/api/v1/challenges/${draftChallengeId}`, {
      headers: govt2Auth.authHeader,
    });
    expect(getDraftRes.status()).toBe(403);

    // Verify Government 2 cannot update Govt 1's DRAFT challenge
    const patchDraftRes = await request.patch(`${config.backendUrl}/api/v1/challenges/${draftChallengeId}`, {
      headers: govt2Auth.authHeader,
      data: { title: 'Unauthorized Modification by Govt 2' },
    });
    expect(patchDraftRes.status()).toBe(403);

    // Verify Government 2 cannot publish Govt 1's DRAFT challenge
    const publishDraftRes = await request.post(`${config.backendUrl}/api/v1/challenges/${draftChallengeId}/publish`, {
      headers: govt2Auth.authHeader,
    });
    expect(publishDraftRes.status()).toBe(403);

    // Verify Government 2 cannot start evaluation on Govt 1's PUBLISHED challenge
    if (challengeId) {
      const evalRes = await request.post(`${config.backendUrl}/api/v1/challenges/${challengeId}/start-evaluation`, {
        headers: govt2Auth.authHeader,
      });
      expect(evalRes.status()).toBe(403);
    }
  });
});
