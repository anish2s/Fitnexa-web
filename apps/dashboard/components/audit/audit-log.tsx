'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ScrollText, ShieldAlert } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, cn } from '@fitexaa/ui';
import type { AuditEntry } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { num } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/nav';
import { PageHeader } from '@/components/page-header';
import { formatWhen } from '@/components/money/payment-detail';
import { describeDevice } from '@/components/settings/account-settings';

/** Plain-language names for audit actions, grouped for the filter. */
const ACTIONS: { group: string; items: [string, string][] }[] = [
  { group: 'Sign-in & account', items: [['auth.login', 'Signed in'], ['auth.account_locked', 'Account locked (wrong passwords)'], ['auth.invite_accepted', 'Accepted invite'], ['auth.password_reset', 'Reset password'], ['auth.password_change', 'Changed password'], ['auth.logout_all', 'Signed out everywhere']] },
  { group: 'Gym', items: [['gym.update', 'Changed gym details'], ['gym.branding_update', 'Changed branding'], ['gym.payment_gateway_update', 'Connected Razorpay'], ['gym.payment_gateway_remove', 'Disconnected Razorpay']] },
  { group: 'Staff', items: [['staff.create', 'Invited staff'], ['staff.update', 'Edited staff'], ['staff.permissions_update', 'Changed staff permissions'], ['staff.deactivate', 'Deactivated staff'], ['staff.activate', 'Reactivated staff'], ['staff.invite', 'Resent invite']] },
  { group: 'Members', items: [['member.create', 'Added member'], ['member.update', 'Edited member'], ['member.self_update', 'Member edited own details'], ['member.archive', 'Archived member'], ['member.restore', 'Restored member'], ['member.photo_update', 'Changed photo'], ['member.photo_remove', 'Removed photo'], ['member.import', 'Imported members'], ['member.export', 'Exported member data'], ['member.self_export', 'Member exported own data'], ['member.erase', 'Erased member data']] },
  { group: 'Plans & memberships', items: [['plan.create', 'Created plan'], ['plan.update', 'Edited plan'], ['plan.archive', 'Archived plan'], ['plan.restore', 'Restored plan'], ['membership.create', 'Sold membership'], ['membership.renew', 'Renewed membership'], ['membership.cancel', 'Cancelled membership']] },
  { group: 'Money', items: [['payment.record', 'Recorded payment'], ['payment.refund', 'Refunded payment'], ['payment.refund_failed', 'Refund failed'], ['payment.duplicate_gateway_payment', 'Duplicate online payment'], ['payment.duplicate_gateway_payment_resolve', 'Resolved duplicate payment']] },
  { group: 'Reminders', items: [['notification.retry', 'Retried reminder'], ['notification.cancel', 'Cancelled reminder']] },
  { group: 'Platform support', items: [['impersonation.start', 'Support signed in as owner'], ['impersonation.end', 'Support session ended'], ['tenant.update', 'Support changed gym'], ['tenant.branding_update', 'Support changed branding'], ['tenant.suspend', 'Gym suspended'], ['tenant.activate', 'Gym reactivated'], ['tenant.owner_invite', 'Owner invited'], ['tenant.create', 'Gym created']] },
];
const ACTION_LABEL: Record<string, string> = Object.fromEntries(ACTIONS.flatMap((g) => g.items));
const labelOf = (action: string) => ACTION_LABEL[action] ?? action.replace(/[._]/g, ' ');

const LIMIT = 30;

function value(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function Actor({ e }: { e: AuditEntry }) {
  if (e.actor.type === 'platform_admin') return <span className="inline-flex items-center gap-1.5"><ShieldAlert className="size-3.5 text-warning-text" />{e.actor.name ?? 'Platform admin'} <Badge tone="warning">Support</Badge></span>;
  if (e.actor.type === 'system') return <span className="text-muted">System</span>;
  return (
    <span>
      {e.actor.name ?? 'Unknown'}
      {e.actor.role && <span className="text-muted"> · {ROLE_LABEL[e.actor.role] ?? e.actor.role}</span>}
      {e.impersonator && <span className="mt-0.5 flex items-center gap-1 text-xs text-warning-text"><ShieldAlert className="size-3" /> by support: {e.impersonator.name}</span>}
    </span>
  );
}

function Target({ e }: { e: AuditEntry }) {
  if (!e.target) return null;
  if (e.target.type === 'member') return <Link href={`/members/${e.target.id}`} className="text-accent-text hover:underline">Open member</Link>;
  if (e.target.type === 'payment') return <Link href="/payments" className="text-accent-text hover:underline">Payments</Link>;
  return <span className="text-muted">{e.target.type}</span>;
}

function Details({ e }: { e: AuditEntry }) {
  const meta = e.metadata ? Object.entries(e.metadata) : [];
  return (
    <div className="grid gap-4 bg-surface-2 px-5 py-4 text-sm lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        {e.changes.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted uppercase">Changes</p>
            <ul className="flex flex-col gap-1">
              {e.changes.map((c, i) => (
                <li key={i} className="grid grid-cols-[minmax(110px,auto)_1fr] gap-3">
                  <span className="text-muted">{c.field}</span>
                  <span className="min-w-0 break-words"><span className="text-subtle line-through">{value(c.from)}</span> → {value(c.to)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {meta.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted uppercase">Details</p>
            <ul className="flex flex-col gap-1">
              {meta.map(([k, v]) => <li key={k} className="grid grid-cols-[minmax(110px,auto)_1fr] gap-3"><span className="text-muted">{k}</span><span className="min-w-0 break-words">{value(v)}</span></li>)}
            </ul>
          </div>
        )}
        {e.changes.length === 0 && meta.length === 0 && <p className="text-muted">No further details.</p>}
      </div>
      <dl className="grid grid-cols-[110px_1fr] content-start gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted">Device</dt><dd>{describeDevice(e.userAgent).label}</dd>
        <dt className="text-muted">IP address</dt><dd className="tabular-nums">{e.ip?.replace(/^::ffff:/, '') ?? '—'}</dd>
        <dt className="text-muted">Request ID</dt><dd className="font-mono break-all">{e.requestId ?? '—'}</dd>
      </dl>
    </div>
  );
}

type Filters = { action: string; actorId: string; from: string; to: string; page: number };

/** Filters in the URL (full page), or in local state (embedded in another page with its own URL). */
function useFilters(embedded: boolean): [Filters, (next: Partial<Filters>) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [local, setLocal] = useState<Filters>({ action: '', actorId: '', from: '', to: '', page: 1 });
  if (embedded) return [local, (next) => setLocal((s) => ({ ...s, page: 1, ...next }))];
  const state: Filters = {
    action: params.get('action') ?? '',
    actorId: params.get('actor') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
  const update = (next: Partial<Filters>) => {
    const m = { ...state, page: 1, ...next };
    const qs = new URLSearchParams();
    if (m.action) qs.set('action', m.action);
    if (m.actorId) qs.set('actor', m.actorId);
    if (m.from) qs.set('from', m.from);
    if (m.to) qs.set('to', m.to);
    if (m.page > 1) qs.set('page', String(m.page));
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return [state, update];
}

export type AuditSource = { kind: 'gym' } | { kind: 'platform' } | { kind: 'tenant'; tenantId: string };

/**
 * The audit log. `gym`: the owner's own log (incl. platform support's actions). `platform`: the
 * console's log (super admin sign-ins). `tenant`: one gym's log, seen from the console.
 */
export function AuditLog({ source = { kind: 'gym' }, embedded = false }: { source?: AuditSource; embedded?: boolean }) {
  const { api } = useAuth();
  const [state, update] = useFilters(embedded);
  const [open, setOpen] = useState<string | null>(null);

  const people = useQuery({
    queryKey: ['staff', 'all'],
    queryFn: () => api.get('/api/v1/staff', { query: { limit: 100 } }).then((r) => r.data),
    enabled: source.kind === 'gym',
  });
  const log = useQuery({
    queryKey: ['audit', source, state],
    queryFn: () => {
      const query = {
        action: state.action || undefined,
        actorId: state.actorId || undefined,
        // The API filters by timestamp: send the start and end of the chosen days (this device's time).
        from: state.from ? new Date(`${state.from}T00:00:00`).toISOString() : undefined,
        to: state.to ? new Date(`${state.to}T23:59:59.999`).toISOString() : undefined,
        page: state.page,
        limit: LIMIT,
      } as never;
      if (source.kind === 'platform') return api.get('/api/v1/platform/audit-logs', { query });
      if (source.kind === 'tenant') return api.get('/api/v1/platform/tenants/{id}/audit-logs', { params: { id: source.tenantId }, query });
      return api.get('/api/v1/audit-logs', { query });
    },
    placeholderData: keepPreviousData,
  });
  const rows = log.data?.data ?? [];
  const meta = log.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className={cn('flex flex-col gap-5', !embedded && 'mx-auto max-w-7xl')}>
      {!embedded && (
        <PageHeader
          title="Audit log"
          description={source.kind === 'platform' ? 'Sign-ins to the platform console. What support did inside a gym is in that gym’s own log.' : 'Every important action in your gym: who did it, when, and from where. Includes anything platform support did.'}
        />
      )}
      <Card className={cn('grid gap-3 p-4 sm:grid-cols-2', source.kind === 'gym' ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-action" className="text-sm font-medium">Action</label>
          <div className="relative">
          <select id="audit-action" value={state.action} onChange={(e) => update({ action: e.target.value })} className="h-9 w-full appearance-none rounded-md border border-border bg-surface pr-9 pl-3 text-base text-fg hover:border-border-strong focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none">
            <option value="">All actions</option>
            {ACTIONS.map((g) => (
              <optgroup key={g.group} label={g.group}>{g.items.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</optgroup>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          </div>
        </div>
        {source.kind === 'gym' && <Select label="Person" value={state.actorId} onChange={(e) => update({ actorId: e.target.value })} options={[{ value: '', label: 'Everyone' }, ...(people.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />}
        <Input label="From" type="date" value={state.from} max={state.to || undefined} onChange={(e) => update({ from: e.target.value })} />
        <Input label="To" type="date" value={state.to} min={state.from || undefined} onChange={(e) => update({ to: e.target.value })} />
      </Card>

      <Card className="overflow-hidden">
        {log.isError ? (
          <EmptyState icon={<AlertTriangle />} title="Couldn’t load the audit log" description={errorMessage(log.error)} action={<Button onClick={() => log.refetch()}>Try again</Button>} />
        ) : !log.data ? (
          <div className="flex flex-col gap-3 p-5" aria-busy>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ScrollText />} title="Nothing found" description="No actions match these filters." />
        ) : (
          <ul className={cn('divide-y divide-border', log.isFetching && 'opacity-70 transition-opacity')}>
            {rows.map((e) => {
              const expanded = open === e.id;
              return (
                <Fragment key={e.id}>
                  <li>
                    <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : e.id)} className="grid w-full grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 px-5 py-3 text-left text-sm hover:bg-surface-2 sm:grid-cols-[170px_1fr_1fr_auto]">
                      <span className="text-muted tabular-nums max-sm:order-2 max-sm:col-span-2 max-sm:text-xs">{formatWhen(e.createdAt)}</span>
                      <span className="font-medium max-sm:order-1">{labelOf(e.action)}{e.changes.length > 0 && <span className="ml-1.5 text-xs font-normal text-subtle">{e.changes.length} {e.changes.length === 1 ? 'change' : 'changes'}</span>}</span>
                      <span className="max-sm:order-3 max-sm:col-span-2"><Actor e={e} /> {e.target && source.kind === 'gym' && <span className="ml-1"><Target e={e} /></span>}</span>
                      <ChevronDown className={cn('size-4 text-subtle transition-transform max-sm:order-1', expanded && 'rotate-180')} />
                    </button>
                  </li>
                  {expanded && <li><Details e={e} /></li>}
                </Fragment>
              );
            })}
          </ul>
        )}
        {meta && rows.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
            <span>{num(meta.total ?? rows.length)} {meta.total === 1 ? 'entry' : 'entries'}</span>
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
    </div>
  );
}
