import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PublicTenant } from '@fitexaa/api-client';
import { gymIcons, letterIconUrl, PLATFORM_ICONS, shortHash, sizedImage } from './icons';

const CLOUD = 'https://res.cloudinary.com/demo/image/upload';
const gym = (branding: Partial<PublicTenant['branding']>, name = 'Iron Paradise'): PublicTenant => ({
  name,
  slug: 'iron',
  status: 'active',
  branding: { logoUrl: null, appIconUrl: null, primaryColor: '#16A34A', secondaryColor: null, defaultTheme: 'dark', updatedAt: null, ...branding },
});

test('Cloudinary icons are re-sized per size: the stored transformation is replaced, square crop', () => {
  const url = `${CLOUD}/c_fill,w_512,h_512,f_auto,q_auto/fitexaa/gyms/g1/branding/icon-abcdefgh12345678`;
  assert.equal(sizedImage(url, 32, 'icon'), `${CLOUD}/c_fill,w_32,h_32,f_png/fitexaa/gyms/g1/branding/icon-abcdefgh12345678`);
  assert.equal(sizedImage(url, 180, 'icon'), `${CLOUD}/c_fill,w_180,h_180,f_png/fitexaa/gyms/g1/branding/icon-abcdefgh12345678`);
});

test('a logo used as the icon is padded on a transparent square, not cropped', () => {
  const url = `${CLOUD}/c_limit,w_512,h_512,f_auto,q_auto/fitexaa/gyms/g1/branding/logo-x`;
  assert.equal(sizedImage(url, 48, 'logo'), `${CLOUD}/c_pad,w_48,h_48,b_transparent,f_png/fitexaa/gyms/g1/branding/logo-x`);
});

test('non-Cloudinary URLs are used as they are', () => {
  assert.equal(sizedImage('https://example.com/icon.png', 32, 'icon'), 'https://example.com/icon.png');
});

test('gym icons: 32/48 favicons and a 180 apple-touch icon, versioned by branding.updatedAt', () => {
  const updatedAt = '2026-11-19T10:00:00.000Z';
  const icons = gymIcons(gym({ appIconUrl: `${CLOUD}/c_fill,w_512,h_512/x/branding/icon-a`, updatedAt }));
  assert.deepEqual(icons.icon.map((i) => i.sizes), ['32x32', '48x48']);
  assert.equal(icons.apple[0]!.sizes, '180x180');
  const v = String(Date.parse(updatedAt));
  assert.ok(icons.icon[0]!.url.endsWith(`c_fill,w_32,h_32,f_png/x/branding/icon-a?v=${v}`), icons.icon[0]!.url);
  assert.ok(icons.apple[0]!.url.includes('w_180,h_180') && icons.apple[0]!.url.endsWith(`?v=${v}`));
});

test('app icon wins over the logo; the logo is used when there is no icon', () => {
  const both = gymIcons(gym({ appIconUrl: `${CLOUD}/a/icon-1`, logoUrl: `${CLOUD}/a/logo-1` }));
  assert.ok(both.icon[0]!.url.includes('icon-1'));
  const logoOnly = gymIcons(gym({ logoUrl: `${CLOUD}/c_limit,w_512/a/logo-1` }));
  assert.ok(logoOnly.icon[0]!.url.includes('c_pad,w_32,h_32,b_transparent,f_png/a/logo-1'));
});

test('no icon or logo: the letter icon, versioned by name and colour', () => {
  const t = gym({});
  const icons = gymIcons(t);
  assert.equal(icons.icon[0]!.url, letterIconUrl(t, 32));
  assert.ok(icons.apple[0]!.url.startsWith('/gym-icon?s=180&v='));
  assert.notEqual(letterIconUrl(t, 32), letterIconUrl(gym({}, 'Other Gym'), 32));
  assert.notEqual(letterIconUrl(t, 32), letterIconUrl(gym({ primaryColor: '#E11D48' }), 32));
});

test('a gym is never given the Fitexaa icons; the platform gets only its own', () => {
  for (const t of [gym({}), gym({ logoUrl: `${CLOUD}/a/logo` }), gym({ appIconUrl: 'https://example.com/i.png' })]) {
    const all = [...gymIcons(t).icon, ...gymIcons(t).apple].map((i) => i.url);
    assert.ok(all.every((u) => !u.includes('/platform/')), all.join(' '));
  }
  assert.ok([...PLATFORM_ICONS.icon, ...PLATFORM_ICONS.apple].every((i) => i.url.startsWith('/platform/')));
});

test('shortHash is stable and short', () => {
  assert.equal(shortHash('a'), shortHash('a'));
  assert.notEqual(shortHash('a'), shortHash('b'));
  assert.ok(shortHash('Iron Paradise|#16A34A').length <= 7);
});
