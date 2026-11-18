import { expect, test, type Page } from '@playwright/test';
import { GYM_LIGHT as GYM, PASSWORD } from './env';

/**
 * Milestone 2: members and plans. Runs on the FitZone demo gym and creates uniquely named records,
 * so it can be re-run against the same database.
 */

const run = Date.now().toString().slice(-6);
/** A fresh 10-digit mobile number per call. */
let seq = 0;
const mobile = () => `9${run}${String(seq++).padStart(3, '0')}`;

async function signIn(page: Page, identifier: string) {
  await page.goto(`${GYM}/login`);
  await page.getByLabel(/email/i).first().fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(`${GYM}/`);
}

test('register a member: consent and duplicate phone are enforced, then edit, archive and restore', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/members`);
  await page.getByRole('link', { name: 'Add member' }).click();
  await expect(page.getByRole('heading', { name: 'Add member' })).toBeVisible();

  const name = `Test Member ${run}`;
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Phone').first().fill('98222 22222'); // Meera Iyer's number in FitZone
  await page.getByLabel('Email').fill(`test${run}@example.com`);

  // Consent is required before anything is sent.
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page.getByText('Ask the member and tick this box before saving')).toBeVisible();

  // The API rejects the duplicate phone; the message lands on the phone field.
  await page.getByLabel('The member has agreed to this').check();
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page.getByText('Another member already has this phone number')).toBeVisible();

  const phone = mobile();
  await page.getByLabel('Phone').first().fill(phone);
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page).toHaveURL(/\/members\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText(/Recorded .* \(wording v1\)/)).toBeVisible();
  await expect(page.getByText('Can sign in with their email')).toBeVisible();

  // Edit: removing the email turns the member app off.
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Email').fill('');
  await page.getByLabel('Staff notes').fill('Prefers evening batch');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Prefers evening batch')).toBeVisible();
  await expect(page.getByText('Add an email to let them use the member app.')).toBeVisible();

  // Archive, find them in the archived list, restore.
  await page.getByRole('button', { name: 'Archive' }).click();
  await page.getByRole('button', { name: 'Archive member' }).click();
  await expect(page.getByText(/Archived on/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);

  await page.goto(`${GYM}/members?view=archived&q=${encodeURIComponent(name)}`);
  await expect(page.getByRole('link', { name })).toBeVisible();
  await page.getByRole('link', { name }).click();
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.getByRole('button', { name: 'Restore member' }).click();
  await expect(page.getByText(/Archived on/)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();

  // Search by the last digits of the phone finds them in the current list.
  await page.goto(`${GYM}/members`);
  await page.getByLabel('Search members').fill(phone.slice(-5));
  await expect(page).toHaveURL(new RegExp(`q=${phone.slice(-5)}`));
  await expect(page.getByRole('link', { name })).toBeVisible();
});

test('CSV import: row errors block the import; a clean file imports after consent', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/members/import`);

  const bad = ['name,phone,email', `,${mobile()},`, `Bad Email ${run},${mobile()},not-an-email`, `Clash ${run},9822222222,`].join('\n');
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from(bad) });
  await expect(page.getByText('Some rows need fixing')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'A member with this phone already exists' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Import \d/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Choose another file' }).click();
  const good = ['Name,Mobile,DOB', `Import One ${run},${mobile()},14/02/1995`, `Import Two ${run},${mobile()},`].join('\n');
  await page.locator('input[type=file]').setInputFiles({ name: 'good.csv', mimeType: 'text/csv', buffer: Buffer.from(good) });
  await expect(page.getByText('Ready to import')).toBeVisible();

  await page.getByRole('button', { name: 'Import 2 members' }).click();
  await expect(page.getByText('Confirm consent before importing')).toBeVisible();
  await page.getByLabel(/All 2 members in this file agreed/).check();
  await page.getByRole('button', { name: 'Import 2 members' }).click();
  await expect(page.getByText('2 members imported')).toBeVisible();

  await page.getByRole('link', { name: 'View members' }).click();
  await page.getByLabel('Search members').fill(`Import One ${run}`);
  await expect(page.getByRole('link', { name: `Import One ${run}` })).toBeVisible();
});

test('plans: create, duplicate name, edit price, archive and restore', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/plans`);
  const name = `Test Plan ${run}`;

  await page.getByRole('button', { name: 'New plan' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Length').selectOption('quarterly');
  await dialog.getByLabel('Price').fill('3999');
  await dialog.getByRole('button', { name: 'Create plan' }).click();
  await expect(dialog).toBeHidden();
  const card = page.locator('div.rounded-xl', { has: page.getByRole('heading', { name, exact: true }) });
  await expect(card.getByText('₹3,999', { exact: true })).toBeVisible();

  // Same name again (any case) is refused on the name field.
  await page.getByRole('button', { name: 'New plan' }).click();
  await dialog.getByLabel('Name').fill(name.toUpperCase());
  await dialog.getByLabel('Price').fill('100');
  await dialog.getByRole('button', { name: 'Create plan' }).click();
  await expect(dialog.getByText('A plan with this name already exists')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await card.getByRole('button', { name: 'Edit' }).click();
  await dialog.getByLabel('Price').fill('4200');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(card.getByText('₹4,200', { exact: true })).toBeVisible();

  await card.getByRole('button', { name: 'Archive' }).click();
  await page.getByRole('button', { name: 'Archive plan' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Archived' }).click();
  await card.getByRole('button', { name: 'Restore' }).click();
  await page.getByRole('button', { name: 'Restore plan' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Current' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
});

test('front desk staff: can add and edit, but not import, archive or manage plans', async ({ page }) => {
  await signIn(page, 'desk@fitzone.demo');
  await page.goto(`${GYM}/members`);
  await expect(page.getByRole('link', { name: 'Add member' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Import CSV' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Meera Iyer' }).click();
  await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Archive' })).toHaveCount(0);

  await page.goto(`${GYM}/members/import`);
  await expect(page.getByText(/not found/i).first()).toBeVisible();

  await page.goto(`${GYM}/plans`);
  await expect(page.getByRole('heading', { name: 'Plans' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New plan' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
});

test('a member id from another gym or a bad link shows "Member not found"', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/members/000000000000000000000000`);
  await expect(page.getByText('Member not found')).toBeVisible();
  await page.goto(`${GYM}/members/not-an-id`);
  await expect(page.getByText('Member not found')).toBeVisible();
});

test('member list shows membership status, expiry and dues, and filters by them', async ({ page }) => {
  await signIn(page, 'owner@fitzone.demo');
  await page.goto(`${GYM}/members`);
  for (const h of ['Plan', 'Status', 'Expires', 'Balance due']) await expect(page.locator('thead').getByText(h, { exact: true })).toBeVisible();

  // Has dues: every row owes money; the filter is kept in the URL.
  /** Wait for the list request a filter change sends (rows from the previous filter stay up until then). */
  const listed = (pattern: RegExp) => page.waitForResponse((r) => r.url().includes('/api/v1/members?') && pattern.test(r.url()));
  await Promise.all([listed(/due=true/), page.getByRole('button', { name: 'Has dues' }).click()]);
  await expect(page).toHaveURL(/due=1/);
  const rows = page.locator('tbody tr');
  await expect(rows.filter({ hasNotText: /₹[\d,]+/ })).toHaveCount(0);

  // Status filter: every row shows that status; combined with dues it narrows further.
  await page.getByRole('button', { name: 'Has dues' }).click();
  await expect(page).not.toHaveURL(/due=1/);
  await Promise.all([listed(/status=none/), page.getByLabel('Membership status').selectOption('none')]);
  await expect(page).toHaveURL(/status=none/);
  await expect(rows.filter({ hasNotText: 'No plan' })).toHaveCount(0);

  await Promise.all([listed(/status=active/), page.getByLabel('Membership status').selectOption('active')]);
  await expect(page).toHaveURL(/status=active/);
  await expect(rows.filter({ hasNotText: /Active|Expiring/ })).toHaveCount(0);
  await expect(rows.first()).toBeVisible(); // FitZone's demo members have active memberships
});
