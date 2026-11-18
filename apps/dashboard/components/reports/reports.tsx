'use client';

import { type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download } from 'lucide-react';
import { AreaChart, Button, Card, CardBody, CardHeader, EmptyState, Input, MiniBars, Segmented, Skeleton, Table, TBody, TD, TH, THead, TR, cn } from '@fitnexa/ui';
import type { GroupBy } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { useDashboard } from '@/lib/queries';
import { addDays, fullDate, inr, inrShort, METHOD_LABEL, num, parseDay, pct, shortDate } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/page-header';

type Kind = 'revenue' | 'memberships' | 'renewals' | 'attendance' | 'growth';
const KINDS: { value: Kind; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'memberships', label: 'Memberships sold' },
  { value: 'renewals', label: 'Renewals' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'growth', label: 'Growth' },
];
type Preset = '30d' | '90d' | '12m' | 'custom';

const yearFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'short', year: '2-digit' });
/** Label for a period start, by grouping: "3 Nov", "w/c 3 Nov", "Nov 26". */
function periodLabel(period: string, groupBy: GroupBy): string {
  if (groupBy === 'month') return yearFmt.format(parseDay(period));
  if (groupBy === 'week') return `w/c ${shortDate(period)}`;
  return shortDate(period);
}

/** Days between two YYYY-MM-DD dates, inclusive. */
const spanDays = (from: string, to: string) => Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000) + 1;

/** Builds and downloads a CSV of what is on screen (formatting only; the numbers come from the API). */
function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Charts with many bars scroll inside their card on phones instead of widening the page. */
function Scroll({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="min-w-[520px] sm:min-w-0">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'danger' | 'success' }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums', tone === 'danger' && 'text-danger-text', tone === 'success' && 'text-success-text')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-subtle">{sub}</p>}
    </Card>
  );
}

function SeriesTable<R extends { period: string }>({ title, rows, groupBy, columns, csvName }: { title: string; rows: R[]; groupBy: GroupBy; columns: { label: string; get: (r: R) => number | null; format: (n: number) => string }[]; csvName: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={title}
        action={
          <Button variant="ghost" size="sm" leftIcon={<Download className="size-4" />} onClick={() => downloadCsv(csvName, ['Period starting', ...columns.map((c) => c.label)], rows.map((r) => [r.period, ...columns.map((c) => c.get(r) ?? '')]))}>
            CSV
          </Button>
        }
      />
      <div className="max-h-[420px] overflow-auto">
        <Table>
          <THead className="sticky top-0 z-[1]">
            <tr><TH>Period</TH>{columns.map((c) => <TH key={c.label} className="text-right">{c.label}</TH>)}</tr>
          </THead>
          <TBody>
            {[...rows].reverse().map((r) => (
              <TR key={r.period}>
                <TD className="whitespace-nowrap text-muted">{periodLabel(r.period, groupBy)}</TD>
                {columns.map((c) => {
                  const v = c.get(r);
                  return <TD key={c.label} className={cn('text-right tabular-nums', !v && 'text-subtle')}>{v === null ? '—' : c.format(v)}</TD>;
                })}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </Card>
  );
}

function Loading({ q, children }: { q: { isError: boolean; error: unknown; data: unknown; refetch: () => unknown }; children: ReactNode }) {
  if (q.isError) return <Card><EmptyState icon={<AlertTriangle />} title="Couldn’t load this report" description={errorMessage(q.error)} action={<Button onClick={() => q.refetch()}>Try again</Button>} /></Card>;
  if (!q.data) return <div className="flex flex-col gap-4" aria-busy><div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-72 rounded-xl" /></div>;
  return <>{children}</>;
}

type Range = { from: string; to: string; groupBy?: GroupBy };
const fileName = (kind: string, r: Range) => `${kind}-${r.from}-to-${r.to}.csv`;

function Revenue({ range }: { range: Range }) {
  const { api } = useAuth();
  const q = useQuery({ queryKey: ['reports', 'revenue', range], queryFn: () => api.get('/api/v1/reports/revenue', { query: range }).then((r) => r.data), placeholderData: keepPreviousData });
  const d = q.data;
  return (
    <Loading q={q}>
      {d && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Received" value={inr(d.totals.receivedPaise)} sub={`${num(d.totals.payments)} ${d.totals.payments === 1 ? 'payment' : 'payments'}`} />
            <Stat label="Refunded" value={d.totals.refundedPaise ? `−${inr(d.totals.refundedPaise)}` : inr(0)} sub={`${num(d.totals.refunds)} ${d.totals.refunds === 1 ? 'refund' : 'refunds'}`} tone={d.totals.refundedPaise ? 'danger' : undefined} />
            <Stat label="Net revenue" value={inr(d.totals.netPaise)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card><CardHeader title="Net revenue" /><CardBody><Scroll><AreaChart data={d.series.map((r) => ({ label: periodLabel(r.period, d.groupBy), value: r.netPaise }))} format={inrShort} label="Net revenue" height={240} /></Scroll></CardBody></Card>
            <Card>
              <CardHeader title="By payment method" />
              <CardBody>
                {Object.keys(d.byMethod ?? {}).length === 0 ? <p className="text-sm text-muted">No payments in this period.</p> : (
                  <ul className="flex flex-col gap-3">
                    {Object.entries(d.byMethod ?? {}).sort((a, b) => (b[1]?.receivedPaise ?? 0) - (a[1]?.receivedPaise ?? 0)).map(([m, v]) => {
                      const share = d.totals.receivedPaise ? (v?.receivedPaise ?? 0) / d.totals.receivedPaise : 0;
                      return (
                        <li key={m} className="text-sm">
                          <div className="flex justify-between"><span>{METHOD_LABEL[m] ?? m}</span><span className="tabular-nums">{inr(v?.receivedPaise ?? 0)}</span></div>
                          <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, share * 100)}%` }} /></div>
                          <p className="mt-0.5 text-xs text-subtle">{num(v?.payments ?? 0)} {v?.payments === 1 ? 'payment' : 'payments'} · {pct(share)}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
          <SeriesTable title="By period" rows={d.series} groupBy={d.groupBy} csvName={fileName('revenue', range)} columns={[
            { label: 'Received (₹)', get: (r) => r.receivedPaise / 100, format: (n) => inr(n * 100) },
            { label: 'Refunded (₹)', get: (r) => r.refundedPaise / 100, format: (n) => inr(n * 100) },
            { label: 'Net (₹)', get: (r) => r.netPaise / 100, format: (n) => inr(n * 100) },
            { label: 'Payments', get: (r) => r.payments, format: num },
          ]} />
        </div>
      )}
    </Loading>
  );
}

function Memberships({ range }: { range: Range }) {
  const { api } = useAuth();
  const q = useQuery({ queryKey: ['reports', 'memberships', range], queryFn: () => api.get('/api/v1/reports/memberships', { query: range }).then((r) => r.data), placeholderData: keepPreviousData });
  const d = q.data;
  return (
    <Loading q={q}>
      {d && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Sold" value={num(d.totals.sold)} sub={`${num(d.totals.new)} new · ${num(d.totals.renewals)} renewals`} />
            <Stat label="Value sold" value={inr(d.totals.valuePaise)} />
            <Stat label="Discounts given" value={inr(d.totals.discountPaise)} />
            <Stat label="Cancelled" value={num(d.totals.cancelled)} tone={d.totals.cancelled ? 'danger' : undefined} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card><CardHeader title="Memberships sold" /><CardBody><Scroll><MiniBars data={d.series.map((r) => ({ label: periodLabel(r.period, d.groupBy), value: r.sold }))} height={240} /></Scroll></CardBody></Card>
            <Card className="overflow-hidden">
              <CardHeader title="By plan" />
              {d.byPlan.length === 0 ? <p className="px-5 pb-5 text-sm text-muted">Nothing sold in this period.</p> : (
                <Table>
                  <THead><tr><TH>Plan</TH><TH className="text-right">Sold</TH><TH className="text-right">Value</TH></tr></THead>
                  <TBody>{d.byPlan.map((p) => <TR key={p.plan}><TD>{p.plan}</TD><TD className="text-right tabular-nums">{num(p.sold)}</TD><TD className="text-right tabular-nums">{inr(p.valuePaise)}</TD></TR>)}</TBody>
                </Table>
              )}
            </Card>
          </div>
          <SeriesTable title="By period" rows={d.series} groupBy={d.groupBy} csvName={fileName('memberships', range)} columns={[
            { label: 'Sold', get: (r) => r.sold, format: num },
            { label: 'New', get: (r) => r.new, format: num },
            { label: 'Renewals', get: (r) => r.renewals, format: num },
            { label: 'Value (₹)', get: (r) => r.valuePaise / 100, format: (n) => inr(n * 100) },
            { label: 'Cancelled', get: (r) => r.cancelled, format: num },
          ]} />
        </div>
      )}
    </Loading>
  );
}

function Renewals({ range }: { range: Range }) {
  const { api } = useAuth();
  const q = useQuery({ queryKey: ['reports', 'renewals', range], queryFn: () => api.get('/api/v1/reports/renewals', { query: range }).then((r) => r.data), placeholderData: keepPreviousData });
  const d = q.data;
  const rate = (v: number | null) => (v === null ? '—' : pct(v));
  return (
    <Loading q={q}>
      {d && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Renewal rate" value={rate(d.totals.renewalRate)} sub="Renewed ÷ (renewed + not renewed)" tone={d.totals.renewalRate !== null && d.totals.renewalRate >= 0.7 ? 'success' : undefined} />
            <Stat label="Memberships ending" value={num(d.totals.ending)} />
            <Stat label="Renewed" value={num(d.totals.renewedOnTime + d.totals.renewedLate)} sub={`${num(d.totals.renewedOnTime)} on time · ${num(d.totals.renewedLate)} late`} />
            <Stat label="Not renewed" value={num(d.totals.notRenewed)} sub={d.totals.pending ? `${num(d.totals.pending)} still to decide` : undefined} tone={d.totals.notRenewed ? 'danger' : undefined} />
          </div>
          <Card><CardHeader title="Memberships ending" description="By the date they end." /><CardBody><Scroll><MiniBars data={d.series.map((r) => ({ label: periodLabel(r.period, d.groupBy), value: r.ending }))} height={220} /></Scroll></CardBody></Card>
          <SeriesTable title="By period" rows={d.series} groupBy={d.groupBy} csvName={fileName('renewals', range)} columns={[
            { label: 'Ending', get: (r) => r.ending, format: num },
            { label: 'On time', get: (r) => r.renewedOnTime, format: num },
            { label: 'Late', get: (r) => r.renewedLate, format: num },
            { label: 'Not renewed', get: (r) => r.notRenewed, format: num },
            { label: 'Pending', get: (r) => r.pending, format: num },
            { label: 'Rate (%)', get: (r) => (r.renewalRate === null ? null : Math.round(r.renewalRate * 100)), format: (n) => `${n}%` },
          ]} />
        </div>
      )}
    </Loading>
  );
}

function Attendance({ range }: { range: Range }) {
  const { api } = useAuth();
  const q = useQuery({ queryKey: ['reports', 'attendance', range], queryFn: () => api.get('/api/v1/reports/attendance', { query: range }).then((r) => r.data), placeholderData: keepPreviousData });
  const d = q.data;
  const busiest = d?.byHour?.reduce((a, b) => (b.checkIns > a.checkIns ? b : a), { hour: -1, checkIns: 0 });
  const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
  return (
    <Loading q={q}>
      {d && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Check-ins" value={num(d.totals.checkIns)} />
            <Stat label="Different members" value={num(d.totals.uniqueMembers)} />
            <Stat label="Average per day" value={d.totals.averagePerDay.toLocaleString('en-IN', { maximumFractionDigits: 1 })} />
            <Stat label="Busiest hour" value={busiest && busiest.checkIns > 0 ? hourLabel(busiest.hour) : '—'} />
          </div>
          <Card><CardHeader title="Check-ins" /><CardBody><Scroll><MiniBars data={d.series.map((r) => ({ label: periodLabel(r.period, d.groupBy), value: r.checkIns }))} height={220} /></Scroll></CardBody></Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {d.byHour && <Card><CardHeader title="By hour of day" /><CardBody><Scroll><MiniBars data={d.byHour.filter((h) => h.hour >= 5 && h.hour <= 23).map((h) => ({ label: hourLabel(h.hour), value: h.checkIns }))} height={180} /></Scroll></CardBody></Card>}
            {d.byWeekday && <Card><CardHeader title="By day of week" /><CardBody><Scroll><MiniBars data={d.byWeekday.map((w) => ({ label: w.weekday.slice(0, 3), value: w.checkIns }))} height={180} /></Scroll></CardBody></Card>}
          </div>
        </div>
      )}
    </Loading>
  );
}

function Growth({ range }: { range: Range }) {
  const { api } = useAuth();
  const q = useQuery({ queryKey: ['reports', 'growth', range], queryFn: () => api.get('/api/v1/reports/growth', { query: range }).then((r) => r.data), placeholderData: keepPreviousData });
  const d = q.data;
  const last = d?.series.at(-1);
  return (
    <Loading q={q}>
      {d && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Joined" value={num(d.totals.joined)} />
            <Stat label="Archived" value={num(d.totals.archived)} />
            <Stat label="Net change" value={`${d.totals.netChange > 0 ? '+' : ''}${num(d.totals.netChange)}`} tone={d.totals.netChange > 0 ? 'success' : d.totals.netChange < 0 ? 'danger' : undefined} />
            <Stat label="Active members" value={last ? num(last.activeMembers) : '—'} sub={last ? `of ${num(last.totalMembers)} on ${fullDate(last.asOf)}` : undefined} />
          </div>
          <Card><CardHeader title="Active members" description="Members with a membership active at the end of each period." /><CardBody><Scroll><AreaChart data={d.series.map((r) => ({ label: periodLabel(r.period, d.groupBy), value: r.activeMembers }))} format={num} label="Active members" height={240} /></Scroll></CardBody></Card>
          <SeriesTable title="By period" rows={d.series} groupBy={d.groupBy} csvName={fileName('growth', range)} columns={[
            { label: 'Joined', get: (r) => r.joined, format: num },
            { label: 'Archived', get: (r) => r.archived, format: num },
            { label: 'Members', get: (r) => r.totalMembers, format: num },
            { label: 'Active', get: (r) => r.activeMembers, format: num },
          ]} />
        </div>
      )}
    </Loading>
  );
}

/** Owner reports (reports:read). Ranges and grouping are the API's; we only choose and display. */
export function Reports() {
  const today = useDashboard().data?.date;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const kind = (KINDS.some((k) => k.value === params.get('report')) ? params.get('report') : 'revenue') as Kind;
  const preset = (['30d', '90d', '12m', 'custom'].includes(params.get('range') ?? '') ? params.get('range') : '30d') as Preset;
  const groupParam = params.get('group');
  const groupBy = (['day', 'week', 'month'].includes(groupParam ?? '') ? groupParam : undefined) as GroupBy | undefined;

  const presetRange = (p: Preset): { from: string; to: string } | null =>
    !today ? null : p === '30d' ? { from: addDays(today, -29), to: today } : p === '90d' ? { from: addDays(today, -89), to: today } : p === '12m' ? { from: addDays(today, -364), to: today } : null;
  const custom = { from: params.get('from') ?? (today ? addDays(today, -29) : ''), to: params.get('to') ?? today ?? '' };
  const span = preset === 'custom' ? custom : presetRange(preset);
  const tooLong = span ? spanDays(span.from, span.to) > 366 : false;
  const badOrder = span ? span.from > span.to : false;
  const range: Range | null = span && !tooLong && !badOrder ? { ...span, ...(groupBy ? { groupBy } : {}) } : null;

  const set = (next: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) qs.set(k, v);
      else qs.delete(k);
    }
    if (qs.get('report') === 'revenue') qs.delete('report');
    if (qs.get('range') === '30d') qs.delete('range');
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader title="Reports" description={span ? `${fullDate(span.from)} – ${fullDate(span.to)}` : ' '} />

      <div role="tablist" aria-label="Report" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        {KINDS.map((k) => (
          <button key={k.value} role="tab" type="button" aria-selected={kind === k.value} onClick={() => set({ report: k.value })} className={cn('-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap', kind === k.value ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}>
            {k.label}
          </button>
        ))}
      </div>

      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Range</span>
          <Segmented size="md" value={preset} onChange={(v) => set({ range: v, ...(v === 'custom' && span ? { from: span.from, to: span.to } : { from: undefined, to: undefined }) })} options={[{ value: '30d', label: '30 days' }, { value: '90d', label: '3 months' }, { value: '12m', label: '12 months' }, { value: 'custom', label: 'Custom' }]} />
        </div>
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <Input label="From" type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && set({ from: e.target.value })} wrapperClassName="lg:w-44" />
            <Input label="To" type="date" value={custom.to} min={custom.from} max={today} onChange={(e) => e.target.value && set({ to: e.target.value })} wrapperClassName="lg:w-44" />
          </div>
        )}
        <div className="flex flex-col gap-1.5 lg:ml-auto">
          <span className="text-sm font-medium">Group by</span>
          <Segmented size="md" value={groupBy ?? 'auto'} onChange={(v) => set({ group: v === 'auto' ? undefined : v })} options={[{ value: 'auto', label: 'Auto' }, { value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
        </div>
      </Card>

      {tooLong || badOrder ? (
        <Card><EmptyState icon={<AlertTriangle />} title={badOrder ? 'The start is after the end' : 'That range is too long'} description={badOrder ? 'Pick a start date before the end date.' : 'Reports cover up to 366 days. Shorten the range.'} /></Card>
      ) : !range ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : kind === 'revenue' ? <Revenue range={range} />
        : kind === 'memberships' ? <Memberships range={range} />
        : kind === 'renewals' ? <Renewals range={range} />
        : kind === 'attendance' ? <Attendance range={range} />
        : <Growth range={range} />}
      <p className="text-xs text-subtle">All dates are in the gym’s time zone. Day, week and month totals always agree.</p>
    </div>
  );
}
