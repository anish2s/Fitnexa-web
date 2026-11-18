import { expect, test, type Page } from '@playwright/test';
import { GYM, GYM_LIGHT, PASSWORD, PLATFORM, UNKNOWN } from './env';

async function fillSignIn(page: Page, identifier: string, password = PASSWORD) {
  await page.getByLabel(/email/i).first().fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('gym branding comes from the host (white-label)', async ({ page }) => {
  await page.goto(`${GYM}/login`);
  await expect(page).toHaveTitle('Powerhouse Fitness');
  await expect(page.locator('body')).toContainText('Powerhouse Fitness');
  await expect(page.getByText('Fitexaa')).toHaveCount(0);
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand-dark-accent').trim());
  expect(accent).toBe('#E11D48');
});

test('unknown gym shows "Gym not found"', async ({ page }) => {
  await page.goto(`${UNKNOWN}/login`);
  await expect(page.getByText('Gym not found')).toBeVisible();
});

test('signed-out visit → sign in → back to the requested page; session survives reload; sign out', async ({ page }) => {
  await page.goto(`${GYM}/members`);
  await expect(page).toHaveURL(/\/login\?next=%2Fmembers$/);

  await fillSignIn(page, 'owner@powerhouse.demo', 'definitely-wrong');
  await expect(page.getByText('don’t match')).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(`${GYM}/members`);

  await page.goto(`${GYM}/`);
  await expect(page.getByText('Monthly revenue')).toBeVisible();

  // The access token is in memory only: reload restores the session from the HttpOnly cookie.
  await page.reload();
  await expect(page.getByText('Monthly revenue')).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name.endsWith('gym_rt'))?.httpOnly).toBe(true);

  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(`${GYM}/`);
  await expect(page).toHaveURL(/\/login/);
});

test('staff see attendance and renewals but no revenue or owner-only menus', async ({ page }) => {
  await page.goto(`${GYM}/login`);
  await fillSignIn(page, 'desk@powerhouse.demo');
  await expect(page.getByText('Active members', { exact: true })).toBeVisible();
  await expect(page.getByText('Monthly revenue')).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const hidden of ['Reports', 'Staff', 'Audit log']) await expect(nav.getByText(hidden, { exact: true })).toHaveCount(0);
  // Owner-only screen by URL: not offered.
  await page.goto(`${GYM}/reports`);
  await expect(page.getByText('Page not found')).toBeVisible();
});

test('owner can sign in with a phone number; gym default theme applies', async ({ page }) => {
  await page.goto(`${GYM_LIGHT}/login`);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  await fillSignIn(page, '98000 00101');
  await expect(page.getByText('Monthly revenue')).toBeVisible();
});

test('platform console: Fitexaa brand, gym list, and no access on gym hosts', async ({ page }) => {
  await page.goto(`${PLATFORM}/login`);
  await expect(page).toHaveTitle('Fitexaa');
  await fillSignIn(page, 'admin@platform.demo');
  await expect(page.getByRole('heading', { name: 'Gyms' })).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await page.goto(`${GYM}/`);
  await expect(page).toHaveURL(/\/login/);
});

test('reset link without a token explains what to do', async ({ page }) => {
  await page.goto(`${GYM}/reset-password`);
  await expect(page.getByText('Link incomplete')).toBeVisible();
  await page.goto(`${GYM}/reset-password?token=not-a-real-token`);
  await page.getByLabel('New password').fill('a-good-password');
  await page.getByLabel('Confirm password').fill('a-good-password');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByText('expired or was already used')).toBeVisible();
});
