/**
 * Display formatting. The API sends integer paise and gym-local `YYYY-MM-DD` dates; we format only
 * here, at the edge. Date-only strings are handled as calendar dates (UTC), never shifted by the
 * browser's time zone.
 */

const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat('en-IN');

/** ₹3,42,500 (whole rupees unless the amount has paise, or `exact`). */
export function inr(paise: number, exact = false): string {
  return exact || paise % 100 !== 0 ? inrFmt2.format(paise / 100) : inrFmt.format(paise / 100);
}

/** Compact rupees for chart axes: ₹3.4L, ₹85k, ₹1.2Cr. */
export function inrShort(paise: number): string {
  const r = paise / 100;
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
  if (r >= 1e7) return `₹${trim(r / 1e7)}Cr`;
  if (r >= 1e5) return `₹${trim(r / 1e5)}L`;
  if (r >= 1e3) return `₹${trim(r / 1e3)}k`;
  return `₹${Math.round(r)}`;
}

export const num = (n: number) => numFmt.format(n);

export function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** % change from `prev` to `cur`; undefined when there is no meaningful base. */
export function change(cur: number, prev: number): number | undefined {
  if (!prev) return undefined;
  return ((cur - prev) / prev) * 100;
}

// ---- Calendar dates (YYYY-MM-DD) ----

export function parseDay(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, day!));
}

export function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  const x = parseDay(d);
  x.setUTCDate(x.getUTCDate() + n);
  return formatDay(x);
}

/** First day of the month `n` months before the month of `d`. */
export function monthStartBefore(d: string, n: number): string {
  const x = parseDay(d);
  return formatDay(new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() - n, 1)));
}

/** Monday of the week containing `d`. */
export function weekStart(d: string): string {
  const dow = (parseDay(d).getUTCDay() + 6) % 7; // Mon = 0
  return addDays(d, -dow);
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...o });
const monthShort = fmt({ month: 'short' });
const weekdayShort = fmt({ weekday: 'short' });
const weekdayLong = fmt({ weekday: 'long' });
const dayMonth = fmt({ day: 'numeric', month: 'short' });
const dayMonthYear = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const longDate = fmt({ weekday: 'long', day: 'numeric', month: 'long' });

export const monthLabel = (d: string) => monthShort.format(parseDay(d));
export const weekdayLabel = (d: string) => weekdayShort.format(parseDay(d));
export const weekdayName = (d: string) => weekdayLong.format(parseDay(d));
export const shortDate = (d: string) => dayMonth.format(parseDay(d));
export const fullDate = (d: string) => dayMonthYear.format(parseDay(d));
export const headerDate = (d: string) => longDate.format(parseDay(d));

/** "6 min ago" for ISO timestamps. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? 'yesterday' : `${d} days ago`;
  return dayMonthYear.format(new Date(iso));
}

export const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  razorpay: 'Online',
};

// ---- Members & plans ----

/** +919811111111 → +91 98111 11111 (Indian mobiles); other numbers are shown as stored. */
export function phone(e164: string | null | undefined): string {
  if (!e164) return '—';
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** E.164 → what a person would type in the phone field (Indian numbers without +91). */
export function phoneForInput(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = /^\+91(\d{10})$/.exec(e164);
  return m ? m[1]! : e164;
}

export const DURATION_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  yearly: 'Yearly',
};

export const MONTHS_LABEL = (months: number) => (months === 1 ? '1 month' : `${months} months`);

export const GENDER_LABEL: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  undisclosed: 'Prefer not to say',
};

export const TAX_LABEL: Record<string, string> = {
  inclusive: 'GST included',
  exclusive: 'GST extra',
  none: 'No GST',
};

/** "4500" or "4,500.50" (rupees typed in a form) → integer paise, or null if not a valid amount. */
export function rupeesToPaise(input: string): number | null {
  const clean = input.replace(/[,\s₹]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [r, p = ''] = clean.split('.');
  return Number(r) * 100 + Number(p.padEnd(2, '0'));
}

/** Integer paise → plain rupees for a form field ("4500" or "4500.50"). */
export function paiseToRupees(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** Whole years between a YYYY-MM-DD birth date and `today` (YYYY-MM-DD). */
export function ageOn(dateOfBirth: string, today: string): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty! - by! - (tm! < bm! || (tm === bm && td! < bd!) ? 1 : 0);
}
