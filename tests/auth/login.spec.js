import { test, expect } from '@playwright/test';
import { loginViaUI } from '../helpers/auth.js';
import { config } from '../helpers/config.js';

test.describe('Authentication Flows', () => {
  test('Government 1 login via UI redirects to government dashboard', async ({ page }) => {
    await loginViaUI(page, config.govt1.email, config.govt1.password, /\/government\/dashboard/);
    await expect(page).toHaveURL(/\/government\/dashboard/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Startup 1 login via UI redirects to startup dashboard', async ({ page }) => {
    await loginViaUI(page, config.startup1.email, config.startup1.password, /\/startup\/dashboard/);
    await expect(page).toHaveURL(/\/startup\/dashboard/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Evaluator 1 login via UI redirects to evaluator dashboard', async ({ page }) => {
    await loginViaUI(page, config.evaluator1.email, config.evaluator1.password, /\/evaluator\/dashboard/);
    await expect(page).toHaveURL(/\/evaluator\/dashboard/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Login fails with invalid credentials and displays error banner', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(config.govt1.email);
    await page.locator('#password').fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();

    // Verify error banner appears and URL does not change to dashboard
    const errorBanner = page.locator('div:has-text("Invalid email or password"), div:has-text("Invalid credentials")');
    await expect(errorBanner.first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('Client-side validation triggers when submitting empty form', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Email address is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    expect(page.url()).toContain('/login');
  });
});
