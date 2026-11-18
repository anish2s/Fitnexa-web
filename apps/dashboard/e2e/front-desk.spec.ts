import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { GYM_LIGHT as GYM } from './env';

/**
 * Milestone 3: front desk and money, on the FitZone demo gym (no GSTIN, Razorpay not connected).
 * Each run registers its own member, so it can be re-run against the same database.
 */

const run = Date.now().toString().slice(-6);
let seq = 0;
const mobile = () => `8${run}${String(seq++).padStart(3, '0')}`;


async function addMember(page: Page, name: string) {
  await page.goto(`${GYM}/members/new`);
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Phone').first().fill(mobile());
  await page.getByLabel('The member has agreed to this').check();
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page).toHaveURL(/\/members\/[a-f0-9]{24}$/);
  return page.url();
}

async function deskSearch(page: Page, text: string) {
  await page.goto(`${GYM}/front-desk`);
  await page.getByLabel('Scan a pass or search members').fill(text);
}

test('sell with discount, part payment and receipt; check in; collect the rest; refund; cancel', async ({ signedIn }) => {
  const page = await signedIn(GYM, 'owner@fitzone.demo');
  const name = `Desk Test ${run}`;
  const profile = await addMember(page, name);

  // No membership: the desk is refused and offered a sale.
  await deskSearch(page, name);
  await page.getByRole('button', { name: 'Check in' }).click();
  await expect(page.getByText('Not checked in')).toBeVisible();
  await expect(page.getByText('No membership. Sell a plan first.')).toBeVisible();
  await page.getByRole('button', { name: 'Sell membership' }).click();

  // Sell Monthly (₹1,500, no GST) with ₹500 off; the API prices it.
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Plan').selectOption({ label: 'Monthly · 1 month · ₹1,500' });
  await dialog.getByLabel('Discount').fill('500');
  await dialog.getByRole('button', { name: 'Sell membership' }).click();
  await expect(dialog.getByText(/Total ₹1,000\.00 after ₹500\.00 discount/)).toBeVisible();
  await expect(dialog.getByLabel('Amount')).toHaveValue('1000');

  // Part payment by UPI.
  await dialog.getByLabel('Amount').fill('600');
  await dialog.getByRole('radio', { name: 'UPI' }).click();
  await dialog.getByLabel('Reference').fill(`UPI${run}`);
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(dialog.getByText('₹600.00 received')).toBeVisible();
  await expect(dialog.getByText('Still due: ₹400.00')).toBeVisible();
  await expect(dialog.getByText(/Receipt RCPT\/\d{4}-\d{2}\/\d{4,}/)).toBeVisible();

  // The PDF receipt opens in a new tab from a blob URL (it needs the bearer token).
  const [tab] = await Promise.all([page.context().waitForEvent('page'), dialog.getByRole('button', { name: 'Receipt (PDF)' }).click()]);
  await expect.poll(() => tab.url()).toMatch(/^blob:/);
  await tab.close();
  await dialog.getByRole('button', { name: 'Done' }).click();

  // Now they are let in, and the desk sees the balance.
  await deskSearch(page, name);
  await page.getByRole('button', { name: 'Check in' }).click();
  await expect(page.getByText(/^Checked in at/)).toBeVisible();
  await expect(page.getByText('₹400.00 due')).toBeVisible();

  // Collect the rest: more than the balance is refused on the amount field.
  await page.getByRole('button', { name: 'Collect' }).click();
  await expect(dialog.getByLabel('Amount')).toHaveValue('400');
  await dialog.getByLabel('Amount').fill('500');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(dialog.locator('#' + (await dialog.getByLabel('Amount').getAttribute('id')) + '-error')).toBeVisible();
  await dialog.getByLabel('Amount').fill('400');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await expect(dialog.getByText('Fully paid.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();

  // A second check-in the same day is not an error.
  await page.getByLabel('Scan a pass or search members').fill(name);
  await page.getByRole('button', { name: 'Check in' }).click();
  await expect(page.getByText(/^Already checked in today at/)).toBeVisible();

  // Payments: today's list has both; refund ₹100 of the UPI payment.
  await page.goto(`${GYM}/payments`);
  await page.getByRole('radio', { name: 'Today' }).click();
  await expect(page).toHaveURL(/from=/);
  const row = page.locator('tbody tr', { hasText: name }).filter({ hasText: 'UPI' });
  await row.click();
  await expect(dialog.getByText(`UPI${run}`)).toBeVisible();
  await dialog.getByRole('button', { name: 'Refund' }).click();
  await dialog.getByLabel('Refund amount').fill('100');
  await dialog.getByLabel('Reason').fill('Test refund');
  await dialog.getByRole('button', { name: 'Record refund' }).click();
  await expect(dialog.getByText(/RFND\/\d{4}-\d{2}\/\d+/)).toBeVisible();
  await expect(dialog.getByText('Balance due')).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(row.getByText('−₹100.00 refunded')).toBeVisible();

  // Profile: the membership can be cancelled with a reason.
  await page.goto(profile);
  await page.getByRole('button', { name: /^Cancel Monthly membership/ }).click();
  await page.getByRole('button', { name: 'Cancel membership' }).click();
  await expect(page.getByText('Say why (at least 3 characters)')).toBeVisible();
  await page.getByRole('dialog').getByLabel('Reason').fill('Test cancellation');
  await page.getByRole('button', { name: 'Cancel membership' }).click();
  await expect(page.getByText('Test cancellation')).toBeVisible();
  await expect(page.getByRole('cell', { name: /Cancelled/ })).toBeVisible();
});

test('online payment: owner sees it is off; staff are told Razorpay isn’t connected', async ({ signedIn }) => {
  const page = await signedIn(GYM, 'owner@fitzone.demo');
  const name = `Online Test ${run}`;
  const profile = await addMember(page, name);
  await page.getByRole('button', { name: 'Sell membership' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Sell membership' }).click();
  await expect(dialog.getByText(/Online payments are off/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Pay online' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Collect later' }).click();

  // The same member, seen by front-desk staff (their own browser).
  const desk = await signedIn(GYM, 'desk@fitzone.demo');
  await desk.goto(profile);
  await desk.getByRole('button', { name: 'Collect' }).first().click();
  const deskDialog = desk.getByRole('dialog');
  await deskDialog.getByRole('button', { name: 'Pay online' }).click();
  await expect(deskDialog.getByText('Online payments aren’t set up for this gym yet.', { exact: false })).toBeVisible();
});

test('front desk staff: no refunds; a bad pass is explained', async ({ signedIn }) => {
  const page = await signedIn(GYM, 'desk@fitzone.demo', '/front-desk');
  await page.getByLabel('Scan a pass or search members').fill('gp1.000000000000000000000000.abc.notavalidsignature');
  await page.keyboard.press('Enter');
  await expect(page.getByText('This QR code isn’t a member pass for this gym.')).toBeVisible();

  await page.goto(`${GYM}/payments`);
  await page.locator('tbody tr').first().click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Receipt (PDF)' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Refund' })).toHaveCount(0);
});

test('renewals: tabs load and the dues tab offers WhatsApp and Collect', async ({ signedIn }) => {
  const page = await signedIn(GYM, 'owner@fitzone.demo', '/renewals');
  await expect(page.getByRole('tab', { name: 'Expiring soon' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Expired' }).click();
  await expect(page).toHaveURL(/tab=expired/);
  await page.getByRole('tab', { name: 'Dues' }).click();
  await expect(page).toHaveURL(/tab=dues/);
  const first = page.locator('tbody tr').first();
  await expect(first.getByRole('button', { name: 'WhatsApp' }).or(page.getByText('No dues'))).toBeVisible();
  await page.getByRole('tab', { name: 'Reminder log' }).click();
  await expect(page.getByRole('combobox', { name: 'Reminder status' })).toBeVisible();
});
