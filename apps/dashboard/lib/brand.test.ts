import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AA_NON_TEXT, AA_TEXT, accentFor, brandVars, contrast, THEME_SURFACES } from '@fitexaa/ui/brand';
import { FITEXAA_ACCENT } from './env';

// The root layout puts brandVars(gym colour) on <html>; these are the colours every gym screen uses.

test('demo gyms and the Fitexaa console accent are AA-readable in both themes', () => {
  for (const colour of ['#E11D48', '#0EA5E9', '#7C3AED', '#16A34A', '#2563EB', FITEXAA_ACCENT]) {
    const v = brandVars(colour);
    for (const t of ['dark', 'light'] as const) {
      const { bg, surface } = THEME_SURFACES[t];
      const accent = v[`--brand-${t}-accent`]!;
      const text = v[`--brand-${t}-accent-text`]!;
      assert.ok(Math.min(contrast(accent, bg), contrast(accent, surface)) >= AA_NON_TEXT, `${colour} ${t} fill`);
      assert.ok(contrast(accent, v[`--brand-${t}-on-accent`]!) >= AA_TEXT, `${colour} ${t} label`);
      assert.ok(Math.min(contrast(text, bg), contrast(text, surface)) >= AA_TEXT, `${colour} ${t} text`);
    }
  }
});

test('any colour an owner can pick (4,096-colour sweep) is made readable, changing it only when needed', () => {
  const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');
  for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17) {
    const c = `#${hex(r)}${hex(g)}${hex(b)}`;
    for (const t of ['dark', 'light'] as const) {
      const a = accentFor(c, t);
      assert.ok(a.ratios.fillVsBg >= AA_NON_TEXT && a.ratios.onAccent >= AA_TEXT && a.ratios.textVsBg >= AA_TEXT, `${c} ${t}`);
      if (!a.adjusted) assert.equal(a.accent, c);
    }
  }
});
