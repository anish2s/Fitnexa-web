import { expect, test, type Page } from '@playwright/test';
import { GYM_LIGHT as GYM, PASSWORD } from './env';

/**
 * Milestone 4: owner tools on the FitZone demo gym. Settings changes are put back at the end of
 * each test; staff and members it creates are uniquely named test records.
 */

const run = Date.now().toString().slice(-6);

async function signIn(page: Page, identifier: string) {
  await page.goto(`${GYM}/login`);
  await page.getByLabel(/email/i).first().fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(`${GYM}/`);
}

test('gym settings: validation on the field, save, and put back', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/settings`);
  const prefix = page.getByLabel('Receipt prefix');
  const original = await prefix.inputValue();

  await page.getByLabel('GSTIN').fill('NOT-A-GSTIN');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Enter a valid 15-character GSTIN')).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();

  await prefix.fill(`T${run.slice(-3)}`);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Gym details saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Receipt prefix')).toHaveValue(`T${run.slice(-3)}`);

  await page.getByLabel('Receipt prefix').fill(original);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Gym details saved')).toBeVisible();
});

test('branding: a new colour re-themes the app, then is put back', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/settings?tab=branding`);
  const hex = page.getByLabel('Hex');
  const original = await hex.inputValue();
  const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand-light-accent').trim().toUpperCase());

  await page.getByRole('radio', { name: '#7C3AED' }).click();
  await page.getByRole('button', { name: 'Save branding' }).click();
  await expect(page.getByText('Branding saved')).toBeVisible();
  await expect.poll(accent).toBe('#7C3AED');

  await page.getByLabel('Hex').fill(original);
  await page.getByRole('button', { name: 'Save branding' }).click();
  await expect.poll(accent).not.toBe('#7C3AED');
});

test('staff: invite with an extra permission, edit, deactivate; audit log records it', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/staff`);
  const name = `Desk Hire ${run}`;
  await page.getByRole('button', { name: 'Invite staff' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('textbox', { name: /^Email/ }).fill(`hire${run}@example.com`);
  await dialog.getByLabel('Import members').check();
  await dialog.getByRole('button', { name: 'Send invite' }).click();
  await expect(page.getByText(/Invite sent to|invite email wasn’t sent/)).toBeVisible();

  const row = page.locator('tbody tr', { hasText: name });
  await expect(row.getByText('Invited')).toBeVisible();
  await expect(row.getByText('+ Import members')).toBeVisible();

  await row.getByRole('button', { name: `Edit ${name}` }).click();
  await dialog.getByLabel('Refund payments').check();
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(row.getByText('+ Import members, Refund payments')).toBeVisible();

  await row.getByRole('button', { name: `Deactivate ${name}` }).click();
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await expect(row.getByText('Deactivated')).toBeVisible();

  await page.goto(`${GYM}/audit-log?action=staff.permissions_update`);
  await expect(page.getByRole('button', { name: /Changed staff permissions/ }).first()).toBeVisible();
});

test('my account: wrong current password is caught; this device is listed', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/settings?tab=account`);
  await page.getByLabel('Current password').fill('definitely-wrong');
  await page.getByLabel('New password', { exact: true }).fill('another-password-123');
  await page.getByLabel('Confirm new password').fill('another-password-123');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('That isn’t your current password')).toBeVisible();
  await expect(page.getByText('This device')).toBeVisible();
});

test('reports: every report loads, CSV downloads, and too-long ranges are explained', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/reports`);
  for (const tab of ['Revenue', 'Memberships sold', 'Renewals', 'Attendance', 'Growth']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByText(/Couldn’t load this report/)).toHaveCount(0);
    await expect(page.locator('main').getByText(/Received|Sold|Renewal rate|Check-ins|Joined/).first()).toBeVisible();
  }
  await expect(page.getByText('Members with a membership active at the end of each period.')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^growth-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/);

  await page.getByRole('radio', { name: 'Custom' }).click();
  await page.getByLabel('From').fill('2024-01-01');
  await expect(page.getByText('That range is too long')).toBeVisible();
});

test('member data: export downloads; erase needs the member code and is permanent', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/members/new`);
  await page.getByLabel('Full name').fill(`Erase Me ${run}`);
  await page.getByLabel('Phone').first().fill(`6${run}999`);
  await page.getByLabel('The member has agreed to this').check();
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page).toHaveURL(/\/members\/[a-f0-9]{24}$/);
  const code = (await page.getByText(/^M\d{4,} · Member since/).textContent())!.split(' ')[0]!;

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download their data' }).click()]);
  expect(download.suggestedFilename()).toBe(`member-${code}-data.json`);

  await page.getByRole('button', { name: 'Erase personal data' }).click();
  await page.getByLabel(`Type ${code} to confirm`).fill('M9999');
  await page.getByRole('dialog').getByLabel('Reason').fill('Test erase request');
  await page.getByRole('button', { name: 'Erase permanently' }).click();
  await expect(page.getByText(`Type ${code} to confirm`, { exact: true }).last()).toBeVisible();
  await page.getByLabel(`Type ${code} to confirm`).fill(code);
  await page.getByRole('button', { name: 'Erase permanently' }).click();
  await expect(page.getByRole('heading', { name: `Erased member ${code}` })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Erase personal data' })).toHaveCount(0);
});

test('front desk staff: only "My account" in settings; owner tools are not reachable', async ({ page }) => {
  await signIn(page, 'desk@fitzone.demo');
  await page.goto(`${GYM}/settings`);
  await expect(page.getByRole('tablist', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Change password' })).toBeVisible();
  for (const path of ['/staff', '/reports', '/audit-log']) {
    await page.goto(`${GYM}${path}`);
    await expect(page.getByText(/not found/i).first()).toBeVisible();
  }
});
