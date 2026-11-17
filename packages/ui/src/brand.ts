/**
 * Gym brand colour → theme-safe accent tokens.
 *
 * A gym can pick any `primaryColor`. We keep its hue and saturation, and only move its lightness
 * as far as needed so that, in each theme:
 *   - the accent fill stands out from the page (≥ 3:1, WCAG 1.4.11 non-text contrast),
 *   - text placed on the accent is readable (≥ 4.5:1; white or near-black, whichever is stronger),
 *   - accent-coloured text (links, active nav label) is readable on the page (≥ 4.5:1).
 * Pure functions, no DOM: usable on the server so the first paint is already branded.
 */

export type Theme = 'dark' | 'light';

/** Page backgrounds the accent is checked against. Keep in sync with tokens.css (`--bg`, `--surface`). */
export const THEME_SURFACES: Record<Theme, { bg: string; surface: string }> = {
  dark: { bg: '#070B12', surface: '#0D131D' },
  light: { bg: '#F6F6F7', surface: '#FFFFFF' },
};

export const ON_DARK_TEXT = '#0A0A0B';
export const ON_LIGHT_TEXT = '#FFFFFF';

export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(input: string): string | null {
  const m = HEX.exec(input.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h.toUpperCase()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex);
  if (!h) throw new Error(`Invalid colour: ${hex}`);
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** WCAG 2.x relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Move lightness in `direction` (in 1% steps) until `ok(colour)` holds, or the end of the range. */
function shiftUntil(hex: string, direction: 1 | -1, ok: (c: string) => boolean): string {
  const [h, s, l0] = rgbToHsl(hexToRgb(hex));
  for (let i = 0; i <= 100; i++) {
    const l = Math.min(1, Math.max(0, l0 + direction * i * 0.01));
    const c = rgbToHex(hslToRgb([h, s, l]));
    if (ok(c)) return c;
    if (l === 0 || l === 1) break;
  }
  return direction === 1 ? '#FFFFFF' : '#000000';
}

/** The text colour (white or near-black) with the higher contrast on `bg`. */
export function readableOn(bg: string): string {
  return contrast(bg, ON_LIGHT_TEXT) >= contrast(bg, ON_DARK_TEXT) ? ON_LIGHT_TEXT : ON_DARK_TEXT;
}

export interface AccentTokens {
  /** Fill for primary buttons, active states, chart highlight. */
  accent: string;
  /** Text/icon colour placed on top of `accent`. */
  onAccent: string;
  /** Accent used as text on the page background (links, active nav label). */
  accentText: string;
  /** Measured ratios, for the design preview and tests. */
  ratios: { fillVsBg: number; onAccent: number; textVsBg: number };
  /** True when the brand colour had to be lightened/darkened for this theme. */
  adjusted: boolean;
}

/**
 * Accent tokens for one theme. On dark we lighten a too-dark brand colour; on light we darken a
 * too-pale one. Lightness only moves until every check passes, so most brand colours come out as-is.
 */
export function accentFor(primaryColor: string, theme: Theme): AccentTokens {
  const base = normalizeHex(primaryColor) ?? '#71717A';
  const { bg, surface } = THEME_SURFACES[theme];
  const dir: 1 | -1 = theme === 'dark' ? 1 : -1;
  const vsPage = (c: string) => Math.min(contrast(c, bg), contrast(c, surface));
  const fillOk = (c: string) =>
    vsPage(c) >= AA_NON_TEXT && contrast(c, readableOn(c)) >= AA_TEXT;

  const accent = fillOk(base) ? base : shiftUntil(base, dir, fillOk);
  const onAccent = readableOn(accent);
  const textOk = (c: string) => vsPage(c) >= AA_TEXT;
  const accentText = textOk(accent) ? accent : shiftUntil(accent, dir, textOk);

  return {
    accent,
    onAccent,
    accentText,
    ratios: {
      fillVsBg: round(vsPage(accent)),
      onAccent: round(contrast(accent, onAccent)),
      textVsBg: round(vsPage(accentText)),
    },
    adjusted: accent !== base,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * CSS custom properties for a gym's brand, for both themes. Put them on any element; the
 * `[data-theme]` rules in tokens.css pick the right set, so dark and light can even be nested.
 */
export function brandVars(primaryColor: string): Record<string, string> {
  const d = accentFor(primaryColor, 'dark');
  const l = accentFor(primaryColor, 'light');
  return {
    '--brand-dark-accent': d.accent,
    '--brand-dark-on-accent': d.onAccent,
    '--brand-dark-accent-text': d.accentText,
    '--brand-light-accent': l.accent,
    '--brand-light-on-accent': l.onAccent,
    '--brand-light-accent-text': l.accentText,
  };
}
