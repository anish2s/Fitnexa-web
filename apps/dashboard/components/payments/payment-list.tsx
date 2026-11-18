'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, IndianRupee, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, Table, TBody, TD, TH, THead, TR, cn } from '@fitexaa/ui';
import type { PaymentListItem } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { useDashboard, useMember } from '@/lib/queries';
import { addDays, fullDate, inr, METHOD_LABEL, monthStartBefore, num } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/page-header';
import { PaymentDetailDialog, formatWhen } from '@/components/money/payment-detail';

const LIMIT = 25;
type Preset = 'today' | 'month' | 'last-month' | 'custom';

function usePaymentParams(today: string | undefined) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const monthStart = today ? monthStartBefore(today, 0) : undefined;
  const state = {
    from: params.get('from') ?? monthStart ?? '',
    to: params.get('to') ?? today ?? '',
    method: params.get('method') ?? '',
    memberId: params.get('member') ?? '',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
  function update(next: Partial<typeof state>) {
    const m = { ...state, ...next };
    const qs = new URLSearchParams();
    if (m.from && m.from !== monthStart) qs.set('from', m.from);
    if (m.to && m.to !== today) qs.set('to', m.to);
    if (m.method) qs.set('method', m.method);
    if (m.memberId) qs.set('member', m.memberId);
    if (m.page > 1) qs.set('page', String(m.page));
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }
  return [state, update] as const;
}

function Total({ label, paise, tone }: { label: string; paise: number | undefined; tone?: 'danger' | 'accent' }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      {paise === undefined ? <Skeleton className="mt-2 h-7 w-28" /> : (
        <p className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums', tone === 'danger' && paise > 0 && 'text-danger-text')}>{tone === 'danger' && paise > 0 ? '−' : ''}{inr(paise)}</p>
      )}
    </Card>
  );
}

function MemberChip({ id, onClear }: { id: string; onClear: () => void }) {
  const member = useMember(id);
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-accent-ring bg-accent-soft pr-1 pl-3 text-sm">
      <span className="max-w-48 truncate">{member.data ? member.data.name : 'One member'}</span>
      <button type="button" onClick={onClear} className="rounded-md p-1 text-muted hover:text-fg" aria-label="Show all members"><X className="size-4" /></button>
    </span>
  );
}

export function PaymentList() {
  const { api } = useAuth();
  const today = useDashboard().data?.date;
  const [state, update] = usePaymentParams(today);
  const [open, setOpen] = useState<string | null>(null);
  const lastMonthStart = today ? monthStartBefore(today, 1) : '';
  const lastMonthEnd = today ? addDays(monthStartBefore(today, 0), -1) : '';
  const preset: Preset =
    state.from === today && state.to === today ? 'today'
    : today && state.from === monthStartBefore(today, 0) && state.to === today ? 'month'
    : state.from === lastMonthStart && state.to === lastMonthEnd ? 'last-month'
    : 'custom';
  const setPreset = (p: Preset) => {
    if (!today) return;
    if (p === 'today') update({ from: today, to: today, page: 1 });
    if (p === 'month') update({ from: monthStartBefore(today, 0), to: today, page: 1 });
    if (p === 'last-month') update({ from: lastMonthStart, to: lastMonthEnd, page: 1 });
  };

  const payments = useQuery({
    queryKey: ['payments', 'list', state],
    queryFn: () =>
      api.get('/api/v1/payments', {
        query: { from: state.from || undefined, to: state.to || undefined, method: (state.method || undefined) as 'cash' | undefined, memberId: state.memberId || undefined, page: state.page, limit: LIMIT },
      }),
    enabled: Boolean(state.from && state.to),
    placeholderData: keepPreviousData,
  });
  const rows: PaymentListItem[] = payments.data?.data ?? [];
  const meta = payments.data?.meta;
  const totals = meta?.totals as { receivedPaise: number; refundedPaise: number; netPaise: number } | undefined;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader title="Payments" description="Every payment taken at the desk or online, with its receipt." />

      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Period</span>
          <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label="Period">
            {([['today', 'Today'], ['month', 'This month'], ['last-month', 'Last month']] as const).map(([v, l]) => (
              // Presets need the gym's "today" (from the API); until then a click would do nothing.
              <button key={v} type="button" role="radio" aria-checked={preset === v} disabled={!today} onClick={() => setPreset(v)} className={cn('h-8 flex-1 rounded-md px-3 text-sm font-medium whitespace-nowrap disabled:opacity-60', preset === v ? 'bg-surface text-fg shadow-1' : 'text-subtle hover:text-fg')}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          <Input label="From" type="date" value={state.from} max={state.to || undefined} onChange={(e) => e.target.value && update({ from: e.target.value, page: 1 })} wrapperClassName="lg:w-44" />
          <Input label="To" type="date" value={state.to} min={state.from || undefined} max={today} onChange={(e) => e.target.value && update({ to: e.target.value, page: 1 })} wrapperClassName="lg:w-44" />
        </div>
        <Select
          label="Method"
          value={state.method}
          onChange={(e) => update({ method: e.target.value, page: 1 })}
          options={[{ value: '', label: 'All methods' }, ...Object.entries(METHOD_LABEL).map(([value, label]) => ({ value, label }))]}
          wrapperClassName="lg:w-44"
        />
        {state.memberId && <MemberChip id={state.memberId} onClear={() => update({ memberId: '', page: 1 })} />}
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Total label="Received" paise={totals?.receivedPaise} />
        <Total label="Refunded" paise={totals?.refundedPaise} tone="danger" />
        <Total label="Net" paise={totals?.netPaise} />
      </div>

      <Card className="overflow-hidden">
        {payments.isError ? (
          <EmptyState icon={<AlertTriangle />} title="Couldn’t load payments" description={errorMessage(payments.error)} action={<Button onClick={() => payments.refetch()}>Try again</Button>} />
        ) : !payments.data ? (
          <div className="flex flex-col gap-3 p-5" aria-busy>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<IndianRupee />} title="No payments in this period" description={`Nothing between ${fullDate(state.from)} and ${fullDate(state.to)}${state.method ? ` paid by ${METHOD_LABEL[state.method]}` : ''}.`} />
        ) : (
          <>
            <div className={cn('hidden md:block', payments.isFetching && 'opacity-70 transition-opacity')}>
              <Table>
                <THead>
                  <tr>
                    <TH>Receipt</TH>
                    <TH>Member</TH>
                    <TH>Method</TH>
                    <TH>Received</TH>
                    <TH className="text-right">Amount</TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((p) => (
                    <TR key={p.id} className="cursor-pointer" onClick={() => setOpen(p.id)}>
                      <TD>
                        <button type="button" className="font-medium tabular-nums hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(p.id); }}>{p.receiptNumber}</button>
                      </TD>
                      <TD>
                        {p.member ? (
                          <div className="leading-tight">
                            <Link href={`/members/${p.member.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">{p.member.name}</Link>
                            <p className="text-xs text-subtle tabular-nums">{p.member.memberCode}</p>
                          </div>
                        ) : '—'}
                      </TD>
                      <TD className="text-muted">{METHOD_LABEL[p.method] ?? p.method}{p.reference && <span className="block max-w-40 truncate text-xs text-subtle">{p.reference}</span>}</TD>
                      <TD className="whitespace-nowrap text-muted">{formatWhen(p.receivedAt)}</TD>
                      <TD className="text-right tabular-nums">
                        <span className="font-medium">{inr(p.amountPaise, true)}</span>
                        {p.refundedPaise > 0 && <span className="mt-0.5 block"><Badge tone="danger">−{inr(p.refundedPaise, true)} refunded</Badge></span>}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setOpen(p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.member?.name ?? p.receiptNumber}</p>
                      <p className="mt-0.5 truncate text-xs text-subtle tabular-nums">{p.receiptNumber} · {METHOD_LABEL[p.method] ?? p.method} · {formatWhen(p.receivedAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums">{inr(p.amountPaise, true)}</p>
                      {p.refundedPaise > 0 && <p className="text-xs text-danger-text tabular-nums">−{inr(p.refundedPaise, true)}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {meta && rows.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
            <span>{num(meta.total ?? rows.length)} {meta.total === 1 ? 'payment' : 'payments'}</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="icon" aria-label="Previous page" disabled={state.page <= 1} onClick={() => update({ page: state.page - 1 })}><ChevronLeft className="size-4" /></Button>
                <span className="px-2 tabular-nums">{state.page} / {totalPages}</span>
                <Button variant="secondary" size="icon" aria-label="Next page" disabled={state.page >= totalPages} onClick={() => update({ page: state.page + 1 })}><ChevronRight className="size-4" /></Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <PaymentDetailDialog paymentId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
