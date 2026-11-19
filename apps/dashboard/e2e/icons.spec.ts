import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { GYM, GYM_LIGHT, PLATFORM } from './env';

/**
 * Per-site favicons and app icons, the CSP, and app icon upload rules.
 * The upload test uses the API's real Cloudinary account (FitZone) and removes the icon afterwards.
 */

/** A solid PNG drawn in the browser (no image library needed in the test runner). */
async function png(page: Page, w: number, h: number): Promise<Buffer> {
  const b64 = await page.evaluate(([w, h]) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d')!;
    x.fillStyle = '#16A34A';
    x.fillRect(0, 0, w, h);
    return c.toDataURL('image/png').split(',')[1]!;
  }, [w, h] as const);
  return Buffer.from(b64, 'base64');
}

/** Width and height from a PNG's header (IHDR). */
const pngSize = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];

/** The <link> icons a page declares. */
async function iconLinks(page: Page, url: string) {
  await page.goto(url);
  return page.evaluate(() =>
    [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => ({
      rel: l.getAttribute('rel'),
      sizes: l.getAttribute('sizes'),
      href: l.getAttribute('href')!,
    })),
  );
}

test('each gym host links its own icons (32, 48, 180); never the Fitexaa ones', async ({ page }) => {
  const ph = await iconLinks(page, `${GYM}/login`);
  const fz = await iconLinks(page, `${GYM_LIGHT}/login`);
  for (const links of [ph, fz]) {
    expect(links.filter((l) => l.rel === 'icon').map((l) => l.sizes)).toEqual(['32x32', '48x48']);
    expect(links.find((l) => l.rel === 'apple-touch-icon')?.sizes).toBe('180x180');
    expect(links.every((l) => !l.href.includes('/platform/'))).toBe(true);
  }
  expect(ph.map((l) => l.href)).not.toEqual(fz.map((l) => l.href));
  // The page itself never names the product on a gym host.
  expect(await page.content()).not.toMatch(/Fitexaa/i);
});

test('fallback letter icon: a PNG per gym, cached for good when versioned; 404 on the platform host', async ({ page }) => {
  const links = await iconLinks(page, `${GYM}/login`);
  const apple = links.find((l) => l.rel === 'apple-touch-icon')!.href;
  test.skip(!apple.startsWith('/gym-icon'), 'Powerhouse has an uploaded icon in this database');

  const res = await page.request.get(`${GYM}${apple}`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
  expect(res.headers()['cache-control']).toContain('immutable');
  expect(pngSize(await res.body())).toEqual([180, 180]);

  const stale = await page.request.get(`${GYM}/gym-icon?s=32&v=old`);
  expect(stale.status()).toBe(200);
  expect(stale.headers()['cache-control']).toBe('public, max-age=300');

  // Different gyms, different icons (letter and colour).
  const fzApple = (await iconLinks(page, `${GYM_LIGHT}/login`)).find((l) => l.rel === 'apple-touch-icon')!.href;
  if (fzApple.startsWith('/gym-icon')) {
    const fz = await (await page.request.get(`${GYM_LIGHT}${fzApple}`)).body();
    expect(Buffer.compare(fz, await res.body())).not.toBe(0);
  }

  expect((await page.request.get(`${PLATFORM}/gym-icon?s=32`)).status()).toBe(404);
});

test('platform host uses the static Fitexaa icons; /favicon.ico sends each host to its own', async ({ page }) => {
  const links = await iconLinks(page, `${PLATFORM}/login`);
  expect(links.find((l) => l.rel === 'apple-touch-icon')?.href).toBe('/platform/apple-touch-icon.png');
  expect(links.filter((l) => l.rel === 'icon').map((l) => l.href)).toContain('/platform/favicon-32.png');
  const img = await page.request.get(`${PLATFORM}/platform/apple-touch-icon.png`);
  expect(img.status()).toBe(200);
  expect(pngSize(await img.body())).toEqual([180, 180]);

  const admin = await page.request.get(`${PLATFORM}/favicon.ico`, { maxRedirects: 0 });
  expect(admin.status()).toBe(302);
  expect(admin.headers().location).toBe('/platform/favicon-48.png');
  const gym = await page.request.get(`${GYM}/favicon.ico`, { maxRedirects: 0 });
  expect(gym.status()).toBe(302);
  expect(gym.headers().location).not.toContain('/platform/');
});

test('Content Security Policy allows Cloudinary images and uploads, nothing broad', async ({ page }) => {
  const res = await page.goto(`${GYM}/login`);
  const csp = res!.headers()['content-security-policy'];
  expect(csp).toContain('img-src');
  expect(csp).toMatch(/img-src [^;]*https:\/\/res\.cloudinary\.com/);
  expect(csp).toMatch(/connect-src [^;]*https:\/\/api\.cloudinary\.com/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toMatch(/img-src [^;]*\s\*(\s|;|$)/);
});

test('app icon upload: SVG refused, non-square cropped, then used as the favicon; removed again', async ({ signedIn }) => {
  test.setTimeout(90_000);
  const page = await signedIn(GYM_LIGHT, 'owner@fitzone.demo', '/settings?tab=branding');
  const input = page.locator('input[type=file]').nth(1); // [0] logo, [1] app icon

  await input.setInputFiles({ name: 'icon.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
  await expect(page.getByText('SVG isn’t supported', { exact: false })).toBeVisible();

  await input.setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer: await png(page, 600, 400) });
  const dialog = page.getByRole('dialog', { name: 'Crop to a square' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Use this' }).click();
  await expect(page.getByText('App icon updated')).toBeVisible({ timeout: 30_000 });

  const links = await iconLinks(page, `${GYM_LIGHT}/login`);
  const fav = links.find((l) => l.sizes === '32x32')!.href;
  expect(fav).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/c_fill,w_32,h_32,f_png\/.+\/branding\/icon-[A-Za-z0-9]{16}\?v=\d+$/);
  expect(links.find((l) => l.rel === 'apple-touch-icon')!.href).toContain('w_180,h_180');

  await page.goto(`${GYM_LIGHT}/settings?tab=branding`);
  await page.getByRole('button', { name: 'Remove' }).nth(0).click();
  await expect(page.getByText('App icon removed')).toBeVisible();
  const after = await iconLinks(page, `${GYM_LIGHT}/login`);
  expect(after.find((l) => l.sizes === '32x32')!.href).toMatch(/^\/gym-icon\?s=32&v=/);
});

test('front desk staff have no branding controls', async ({ signedIn }) => {
  const page = await signedIn(GYM_LIGHT, 'desk@fitzone.demo', '/settings');
  await expect(page.getByRole('tab', { name: 'Branding' })).toHaveCount(0);
  await expect(page.getByText('App icon')).toHaveCount(0);
});
