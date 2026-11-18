import { expect, test } from './fixtures';
import { GYM_LIGHT, PLATFORM } from './env';

/**
 * Milestone 5: platform console. Creates one uniquely named gym per run; "log in as owner" runs
 * against the FitZone demo gym.
 */

const run = Date.now().toString().slice(-6);


test('create a gym, edit it, rebrand it, suspend and reactivate it', async ({ signedIn }) => {
  const page = await signedIn(PLATFORM, 'admin@platform.demo');
  const context = page.context();
  await page.getByRole('link', { name: 'New gym' }).first().click();

  // The address is suggested from the name and checked as you type.
  await page.getByLabel('Gym name').fill(`E2E Gym ${run}`);
  await expect(page.getByRole('textbox', { name: /^Web address/ })).toHaveValue(`e2e-gym-${run}`);
  await expect(page.getByText('Available')).toBeVisible();
  await page.getByRole('textbox', { name: /^Web address/ }).fill('admin');
  await expect(page.getByText('This address is reserved for the platform.')).toBeVisible();
  await page.getByRole('textbox', { name: /^Web address/ }).fill(`e2e-gym-${run}`);

  await page.getByLabel('City').fill('Mysuru');
  await page.getByLabel('Owner’s name').fill('E2E Owner');
  await page.getByRole('textbox', { name: /^Owner’s email/ }).fill(`owner${run}@example.com`);
  await page.getByRole('button', { name: '#16A34A' }).click();
  await page.getByRole('button', { name: 'Create gym' }).click();
  await expect(page.getByText(`E2E Gym ${run} is live`)).toBeVisible();
  await page.getByRole('link', { name: 'Open gym' }).click();

  await expect(page.getByRole('heading', { name: `E2E Gym ${run}` })).toBeVisible();
  await expect(page.getByText('Invited')).toBeVisible();
  await expect(page.getByText('Mysuru')).toBeVisible();

  // Details: the same form the owner uses, saved through the platform API.
  await page.getByRole('tab', { name: 'Details' }).click();
  await page.getByLabel('City').fill('Mangaluru');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Gym details saved')).toBeVisible();

  // Branding: colour only (uploads happen on the gym's own site).
  await page.getByRole('tab', { name: 'Branding' }).click();
  await expect(page.getByText('Logo and app icon')).toHaveCount(0);
  await page.getByRole('radio', { name: '#2563EB' }).click();
  await page.getByRole('button', { name: 'Save branding' }).click();
  await expect(page.getByText('Branding saved')).toBeVisible();

  // Suspend: the gym's own site shows that access is paused; reactivate.
  await page.getByRole('button', { name: 'Suspend' }).click();
  await page.getByRole('dialog').getByLabel('Reason').fill('E2E suspension');
  await page.getByRole('button', { name: 'Suspend gym' }).click();
  await expect(page.getByText(/Suspended on/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in as owner' })).toBeDisabled();
  const gymSite = await context.newPage();
  await gymSite.goto(`http://e2e-gym-${run}.localhost:${new URL(PLATFORM).port}/login`);
  await expect(gymSite.getByText(`Access to E2E Gym ${run} is paused.`)).toBeVisible();
  await gymSite.close();
  await page.getByRole('button', { name: 'Reactivate' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivate' }).click();
  await expect(page.getByText(/Suspended on/)).toHaveCount(0);

  // The gym's audit log, seen from the console.
  await page.getByRole('tab', { name: 'Audit log' }).click();
  await expect(page.getByRole('button', { name: /Gym reactivated/ })).toBeVisible();
});

test('log in as owner: new tab with the owner session and banner, nothing stored, ended cleanly', async ({ signedIn }) => {
  const page = await signedIn(PLATFORM, 'admin@platform.demo');
  const context = page.context();
  await page.getByLabel('Search gyms').fill('fitzone');
  await page.getByRole('link', { name: 'FitZone' }).click();
  await page.getByRole('button', { name: 'Log in as owner' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Open gym as owner' }).click();
  await expect(dialog.getByText('Give a reason of at least 10 characters', { exact: false })).toBeVisible();
  await dialog.getByLabel('Reason').fill(`E2E support check ${run}`);
  const [tab] = await Promise.all([context.waitForEvent('page'), dialog.getByRole('button', { name: 'Open gym as owner' }).click()]);

  await expect(tab.getByText('Support session.')).toBeVisible({ timeout: 30_000 });
  await expect(tab).toHaveURL(`${GYM_LIGHT}/`);
  expect(await tab.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  // Owner tools are open, but the owner's password can't be changed in a support session.
  await tab.goto(`${GYM_LIGHT}/`); // a reload ends an in-memory support session
  await expect(tab).toHaveURL(/\/login/);

  // Start again and end it with the banner button.
  await page.bringToFront();
  await page.getByRole('button', { name: 'Log in as owner' }).click();
  await dialog.getByLabel('Reason').fill(`E2E support check ${run} again`);
  const [tab2] = await Promise.all([context.waitForEvent('page'), dialog.getByRole('button', { name: 'Open gym as owner' }).click()]);
  await expect(tab2.getByText('Support session.')).toBeVisible({ timeout: 30_000 });
  await tab2.getByRole('link', { name: 'Settings' }).click();
  await tab2.getByRole('tab', { name: 'My account' }).click();
  await expect(tab2.getByText('The owner’s password can’t be changed in this session.')).toBeVisible();
  await tab2.getByRole('button', { name: 'End session' }).click();
  await expect(tab2.getByRole('heading', { name: 'Support session ended' })).toBeVisible();

  // Recorded in the gym's audit log.
  await page.getByRole('tab', { name: 'Audit log' }).click();
  await expect(page.getByRole('button', { name: /Support signed in as owner/ }).first()).toBeVisible();
});

test('platform audit log lists console sign-ins; gym users can’t reach console pages', async ({ signedIn }) => {
  const page = await signedIn(PLATFORM, 'admin@platform.demo');
  await page.getByRole('link', { name: 'Audit log' }).click();
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Signed in/ }).first()).toBeVisible();

  // A gym owner (signed in on their own gym) gets a real 404 for console pages, decided on the server.
  const owner = await signedIn(GYM_LIGHT, 'owner@fitzone.demo');
  const res = await owner.goto(`${GYM_LIGHT}/gyms/new`);
  expect(res?.status()).toBe(404);
  await expect(owner.getByText(/not found/i).first()).toBeVisible();
  await owner.goto(`${GYM_LIGHT}/support-session`);
  await expect(owner.getByText('Open this from the platform console', { exact: false })).toBeVisible();
});
