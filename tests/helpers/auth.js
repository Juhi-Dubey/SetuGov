import { expect } from '@playwright/test';
import { config } from './config.js';

/**
 * Perform login using the real UI workflow.
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} password
 * @param {string|RegExp} [expectedUrlPattern]
 */
export async function loginViaUI(page, email, password, expectedUrlPattern = /\/(dashboard|challenges|evaluator|startup|government)/) {
  await page.goto('/login');
  
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  const submitButton = page.locator('button[type="submit"]');

  await expect(emailInput).toBeVisible();
  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Submit and wait for redirect
  await Promise.all([
    page.waitForURL(expectedUrlPattern, { timeout: 15000 }),
    submitButton.click(),
  ]);

  // Ensure login was successful and we are not on login page
  expect(page.url()).not.toContain('/login');
}

/**
 * Perform logout using the UI / storage cleanup.
 * @param {import('@playwright/test').Page} page
 */
export async function logoutViaUI(page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
  await page.goto('/login');
  await expect(page.locator('#email')).toBeVisible();
}

/**
 * Authenticate via API to obtain JWT token for API assertions and setup.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} email
 * @param {string} password
 */
export async function loginViaAPI(request, email, password) {
  const response = await request.post(`${config.backendUrl}/api/v1/auth/login`, {
    headers: {
      'x-bypass-rate-limit': 'test-bypass',
    },
    data: { email, password },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`API login failed for ${email} (${response.status()}): ${errorBody}`);
  }

  const data = await response.json();
  const token = data.data?.token || data.token;
  const user = data.data?.user || data.user;

  return {
    token,
    user,
    authHeader: {
      Authorization: `Bearer ${token}`,
      'x-bypass-rate-limit': 'test-bypass',
    },
  };
}
