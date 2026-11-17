import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accentFor, contrast, normalizeHex, brandVars, type Theme } from './brand.ts';

const themes: Theme[] = ['dark', 'light'];

test('contrast matches known WCAG values', () => {
  assert.equal(Math.round(contrast('#000000', '#FFFFFF') * 10) / 10, 21);
  assert.equal(contrast('#777777', '#777777'), 1);
});

test('normalizeHex accepts short and unprefixed hex, rejects junk', () => {
  assert.equal(normalizeHex('e11d48'), '#E11D48');
  assert.equal(normalizeHex('#fff'), '#FFFFFF');
  assert.equal(normalizeHex('red'), null);
});

test('the two sample gym colours', () => {
  // Rose works unchanged in both themes.
  assert.equal(accentFor('#E11D48', 'dark').accent, '#E11D48');
  assert.equal(accentFor('#E11D48', 'light').accent, '#E11D48');
  assert.equal(accentFor('#E11D48', 'light').onAccent, '#FFFFFF');
  // Sky is too pale on white: darkened for light theme, kept on dark with dark text on it.
  assert.equal(accentFor('#0EA5E9', 'dark').accent, '#0EA5E9');
  assert.equal(accentFor('#0EA5E9', 'dark').onAccent, '#0A0A0B');
  assert.equal(accentFor('#0EA5E9', 'light').adjusted, true);
});

test('every brand colour ends up AA-readable in both themes', () => {
  const samples = ['#E11D48', '#0EA5E9', '#FFFF00', '#FFFFFF', '#000000', '#111827', '#22C55E',
    '#F59E0B', '#7C3AED', '#808080', '#FDE68A', '#1E3A8A', '#00FFFF', '#FF00FF'];
  for (const c of samples) {
    for (const t of themes) {
      const a = accentFor(c, t);
      assert.ok(a.ratios.fillVsBg >= 3, `${c} ${t} fill ${a.ratios.fillVsBg}`);
      assert.ok(a.ratios.onAccent >= 4.5, `${c} ${t} on-accent ${a.ratios.onAccent}`);
      assert.ok(a.ratios.textVsBg >= 4.5, `${c} ${t} text ${a.ratios.textVsBg}`);
    }
  }
});

test('invalid colour falls back to neutral instead of throwing', () => {
  assert.doesNotThrow(() => brandVars('not-a-colour'));
});
