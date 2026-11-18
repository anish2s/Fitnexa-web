'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, IndianRupee, MailCheck, MessageCircle, RefreshCw, RotateCcw, X } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, Select, Skeleton, Table, TBody, TD, TH, THead, TR, useToast, cn, type BadgeTone } from '@fitexaa/ui';
import type { MemberRef } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { actionMessage, errorMessage } from '@/lib/errors';
import { fullDate, inr, num, phone } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { CollectPaymentDialog, payableOf, type Payable } from '@/components/money/collect-payment';
import { SellMembershipDialog, type SaleTarget } from '@/components/money/sell-membership';
import { formatWhen } from '@/components/money/payment-detail';

type Tab = 'expiring' | 'expired' | 'dues' | 'reminders';
const LIMIT = 20;

/** Opens the member's WhatsApp chat with a prepared message. The gym sends it from its own phone. */
function WhatsAppButton({ memberId, template, url }: { memberId: string; template: 'renewal' | 'payment_due'; url?: string }) {
  const { api } = useAuth();
  const toast = useToast();
  const cls = 'inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-sm font-medium text-fg hover:bg-surface-2';
  if (url) {
    return <a href={url} target="_blank" rel="noopener noreferrer" className={cls}><MessageCircle className="size-4 text-success-text" /> WhatsApp</a>;
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={async () => {
        const tab = window.open('', '_blank');
        try {
          const { data } = await api.get('/api/v1/members/{id}/whatsapp', { params: { id: memberId }, query: { template } });
          if (tab) tab.location.href = data.url;
          else window.location.href = data.url;
        } catch (err) {
          tab?.close();
          toast.show({ tone: 'error', title: 'Couldn’t prepare the message', description: actionMessage(err) });
        }
      }}
    >
      <MessageCircle className="size-4 text-success-text" /> WhatsApp
    </button>
  );
}

function MemberCell({ m }: { m: Pick<MemberRef, 'id' | 'name' | 'memberCode' | 'photoUrl'> & { phone: string | null } }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={m.name} src={m.photoUrl} size={34} />
      <div className="min-w-0 leading-tight">
        <Link href={`/members/${m.id}`} className="truncate font-medium hover:underline">{m.name}</Link>
        <p className="text-xs text-subtle tabular-nums">{m.memberCode} · {phone(m.phone)}</p>
      </div>
    </div>
  );
}

function Pager({ page, totalPages, total, noun, onPage }: { page: number; totalPages: number; total: number; noun: string; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
      <span>{num(total)} {noun}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="size-4" /></Button>
          <span className="px-2 tabular-nums">{page} / {totalPages}</span>
          <Button variant="secondary" size="icon" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight className="size-4" /></Button>
        </div>
      )}
    </div>
  );
}

function ListState({ q, empty, children }: { q: { isError: boolean; error: unknown; data: unknown; refetch: () => unknown }; empty: ReactNode; children: ReactNode }) {
  if (q.isError) return <EmptyState icon={<AlertTriangle />} title="Couldn’t load this list" description={errorMessage(q.error)} action={<Button onClick={() => q.refetch()}>Try again</Button>} />;
  if (!q.data) return <div className="flex flex-col gap-3 p-5" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>;
  return <>{empty ? empty : children}</>;
}

function Expiring({ page, onPage, onRenew }: { page: number; onPage: (p: number) => void; onRenew: (memberId: string) => void }) {
  const { api, can } = useAuth();
  const q = useQuery({ queryKey: ['renewals', 'expiring', page], queryFn: () => api.get('/api/v1/memberships/expiring', { query: { page, limit: LIMIT } }), placeholderData: keepPreviousData });
  const rows = q.data?.data ?? [];
  const meta = q.data?.meta as { total?: number; totalPages?: number; days?: number; until?: string } | undefined;
  return (
    <ListState q={q} empty={rows.length === 0 && <EmptyState icon={<CalendarClock />} title="Nothing expiring soon" description={meta?.until ? `No memberships end before ${fullDate(meta.until)} without a renewal.` : undefined} />}>
      <p className="border-b border-border px-5 py-3 text-sm text-muted">Active memberships ending in the next {meta?.days ?? '—'} days{meta?.until ? ` (by ${fullDate(meta.until)})` : ''} that haven’t been renewed.</p>
      <Table>
        <THead><tr><TH>Member</TH><TH className="hidden md:table-cell">Plan</TH><TH>Ends</TH><TH className="text-right"><span className="sr-only">Actions</span></TH></tr></THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id}>
              <TD><MemberCell m={r.member} /></TD>
              <TD className="hidden text-muted md:table-cell">{r.plan.name}</TD>
              <TD className="whitespace-nowrap">{fullDate(r.endDate)}<p className="text-xs text-warning-text">{r.daysLeft === 1 ? 'last day' : `${r.daysLeft} days left`}</p></TD>
              <TD>
                <div className="flex justify-end gap-2">
                  <WhatsAppButton memberId={r.member.id} template="renewal" url={r.whatsappUrl} />
                  {can('memberships:manage') && <Button size="sm" onClick={() => onRenew(r.member.id)}>Renew</Button>}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Pager page={page} totalPages={meta?.totalPages ?? 1} total={meta?.total ?? rows.length} noun={meta?.total === 1 ? 'membership' : 'memberships'} onPage={onPage} />
    </ListState>
  );
}

function Expired({ page, onPage, onRenew }: { page: number; onPage: (p: number) => void; onRenew: (memberId: string) => void }) {
  const { api, can } = useAuth();
  const q = useQuery({ queryKey: ['renewals', 'expired', page], queryFn: () => api.get('/api/v1/members', { query: { status: 'expired', sort: '-joinDate', page, limit: LIMIT } }), placeholderData: keepPreviousData });
  const rows = q.data?.data ?? [];
  return (
    <ListState q={q} empty={rows.length === 0 && <EmptyState icon={<CalendarClock />} title="No lapsed members" description="Members whose last membership ended without a renewal appear here." />}>
      <p className="border-b border-border px-5 py-3 text-sm text-muted">Current members whose latest membership has ended. Win them back with a message or a renewal.</p>
      <Table>
        <THead><tr><TH>Member</TH><TH className="hidden md:table-cell">Last plan</TH><TH>Ended</TH><TH className="text-right"><span className="sr-only">Actions</span></TH></tr></THead>
        <TBody>
          {rows.map((m) => (
            <TR key={m.id}>
              <TD><MemberCell m={m} /></TD>
              <TD className="hidden text-muted md:table-cell">{m.membership.plan?.name ?? '—'}</TD>
              <TD className="whitespace-nowrap">{m.membership.endDate ? fullDate(m.membership.endDate) : '—'}{m.balanceDuePaise > 0 && <p className="text-xs text-warning-text">{inr(m.balanceDuePaise)} due</p>}</TD>
              <TD>
                <div className="flex justify-end gap-2">
                  <WhatsAppButton memberId={m.id} template="renewal" />
                  {can('memberships:manage') && <Button size="sm" onClick={() => onRenew(m.id)}>Renew</Button>}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Pager page={page} totalPages={q.data?.meta?.totalPages ?? 1} total={q.data?.meta?.total ?? rows.length} noun={q.data?.meta?.total === 1 ? 'member' : 'members'} onPage={onPage} />
    </ListState>
  );
}

function Dues({ page, onPage, onCollect }: { page: number; onPage: (p: number) => void; onCollect: (p: Payable) => void }) {
  const { api, can } = useAuth();
  const q = useQuery({ queryKey: ['renewals', 'dues', page], queryFn: () => api.get('/api/v1/memberships', { query: { due: 'true', page, limit: LIMIT } }), placeholderData: keepPreviousData });
  const rows = q.data?.data ?? [];
  return (
    <ListState q={q} empty={rows.length === 0 && <EmptyState icon={<IndianRupee />} title="No dues" description="Every membership is fully paid." />}>
      <p className="border-b border-border px-5 py-3 text-sm text-muted">Memberships with money still owed.</p>
      <Table>
        <THead><tr><TH>Member</TH><TH className="hidden md:table-cell">Membership</TH><TH className="text-right">Due</TH><TH className="text-right"><span className="sr-only">Actions</span></TH></tr></THead>
        <TBody>
          {rows.map((ms) => (
            <TR key={ms.id}>
              <TD><MemberCell m={ms.member} /></TD>
              <TD className="hidden text-muted md:table-cell">{ms.plan.name}<p className="text-xs text-subtle">{fullDate(ms.startDate)} – {fullDate(ms.endDate)}</p></TD>
              <TD className="text-right font-medium text-warning-text tabular-nums">{inr(ms.balancePaise, true)}<p className="text-xs font-normal text-subtle">of {inr(ms.totalPaise, true)}</p></TD>
              <TD>
                <div className="flex justify-end gap-2">
                  <WhatsAppButton memberId={ms.member.id} template="payment_due" />
                  {can('payments:record') && <Button size="sm" leftIcon={<IndianRupee className="size-3.5" />} onClick={() => onCollect(payableOf(ms, ms.member.name))}>Collect</Button>}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Pager page={page} totalPages={q.data?.meta?.totalPages ?? 1} total={q.data?.meta?.total ?? rows.length} noun={q.data?.meta?.total === 1 ? 'membership' : 'memberships'} onPage={onPage} />
    </ListState>
  );
}

const NOTE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  queued: { label: 'Queued', tone: 'info' },
  sending: { label: 'Sending', tone: 'info' },
  sent: { label: 'Sent', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  skipped: { label: 'Skipped', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};
const KIND_LABEL: Record<string, string> = { renewal_expiring: 'Ending soon', renewal_expired: 'Ended' };

function Reminders({ page, onPage }: { page: number; onPage: (p: number) => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['renewals', 'reminders', status, page],
    queryFn: () => api.get('/api/v1/notifications', { query: { status: (status || undefined) as 'sent' | undefined, page, limit: LIMIT } }),
    placeholderData: keepPreviousData,
  });
  const rows = q.data?.data ?? [];
  async function act(id: string, action: 'retry' | 'cancel') {
    setBusy(id);
    try {
      await api.post(action === 'retry' ? '/api/v1/notifications/{id}/retry' : '/api/v1/notifications/{id}/cancel', { params: { id } });
      toast.show({ tone: 'success', title: action === 'retry' ? 'Reminder queued again' : 'Reminder cancelled' });
      await queryClient.invalidateQueries({ queryKey: ['renewals', 'reminders'] });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t update the reminder', description: actionMessage(err) });
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Renewal reminder emails sent automatically (09:00–20:00 gym time). Members without an email are skipped: use WhatsApp for them.</p>
        <Select aria-label="Reminder status" value={status} onChange={(e) => { setStatus(e.target.value); onPage(1); }} options={[{ value: '', label: 'All' }, ...Object.entries(NOTE_STATUS).map(([value, s]) => ({ value, label: s.label }))]} wrapperClassName="sm:w-40 shrink-0" />
      </div>
      <ListState q={q} empty={rows.length === 0 && <EmptyState icon={<MailCheck />} title="No reminders" description={status ? 'None with this status.' : 'Reminders appear here as memberships near their end.'} />}>
        <Table>
          <THead><tr><TH>Member</TH><TH className="hidden md:table-cell">Reminder</TH><TH>Status</TH><TH className="hidden lg:table-cell">When</TH><TH className="text-right"><span className="sr-only">Actions</span></TH></tr></THead>
          <TBody>
            {rows.map((n) => (
              <TR key={n.id}>
                <TD>{n.member ? <Link href={`/members/${n.member.id}`} className="font-medium hover:underline">{n.member.name}</Link> : '—'}<p className="text-xs text-subtle">{n.member?.memberCode}</p></TD>
                <TD className="hidden text-muted md:table-cell">{KIND_LABEL[n.kind] ?? n.kind} · {n.channel}</TD>
                <TD>
                  <Badge tone={NOTE_STATUS[n.status]?.tone ?? 'neutral'} dot>{NOTE_STATUS[n.status]?.label ?? n.status}</Badge>
                  {n.reason && <p className="mt-1 max-w-56 text-xs text-subtle">{n.reason}</p>}
                </TD>
                <TD className="hidden whitespace-nowrap text-muted lg:table-cell">{formatWhen(n.sentAt ?? n.nextAttemptAt ?? n.createdAt)}{n.attempts > 1 && <p className="text-xs text-subtle">{n.attempts} attempts</p>}</TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    {(n.status === 'failed' || n.status === 'skipped') && <Button size="sm" variant="secondary" leftIcon={<RotateCcw className="size-3.5" />} loading={busy === n.id} onClick={() => act(n.id, 'retry')}>Retry</Button>}
                    {n.status === 'queued' && <Button size="sm" variant="ghost" leftIcon={<X className="size-3.5" />} loading={busy === n.id} onClick={() => act(n.id, 'cancel')}>Cancel</Button>}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <Pager page={page} totalPages={q.data?.meta?.totalPages ?? 1} total={q.data?.meta?.total ?? rows.length} noun={q.data?.meta?.total === 1 ? 'reminder' : 'reminders'} onPage={onPage} />
      </ListState>
    </>
  );
}

export function Renewals() {
  const { api, can } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabs: { value: Tab; label: string }[] = [
    { value: 'expiring', label: 'Expiring soon' },
    { value: 'expired', label: 'Expired' },
    { value: 'dues', label: 'Dues' },
    ...(can('renewals:manage') ? [{ value: 'reminders' as const, label: 'Reminder log' }] : []),
  ];
  const tab = (tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'expiring') as Tab;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const go = (next: { tab?: Tab; page?: number }) => {
    const qs = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== 'expiring') qs.set('tab', t);
    const p = next.page ?? 1;
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const [sale, setSale] = useState<SaleTarget | null>(null);
  const [collect, setCollect] = useState<Payable | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  async function renew(memberId: string) {
    try {
      const { data } = await api.get('/api/v1/members/{id}', { params: { id: memberId } });
      setSale({ memberId, memberName: data.name, summary: data.membership });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t open this member', description: actionMessage(err) });
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        title="Renewals"
        description="Who to follow up with: memberships ending soon, lapsed members and unpaid balances."
        actions={<Button variant="ghost" leftIcon={<RefreshCw className="size-4" />} onClick={() => queryClient.invalidateQueries({ queryKey: ['renewals'] })}>Refresh</Button>}
      />
      <div role="tablist" aria-label="Renewals" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={tab === t.value}
            onClick={() => go({ tab: t.value })}
            className={cn('-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap', tab === t.value ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Card className="overflow-hidden">
        {tab === 'expiring' && <Expiring page={page} onPage={(p) => go({ page: p })} onRenew={renew} />}
        {tab === 'expired' && <Expired page={page} onPage={(p) => go({ page: p })} onRenew={renew} />}
        {tab === 'dues' && <Dues page={page} onPage={(p) => go({ page: p })} onCollect={setCollect} />}
        {tab === 'reminders' && <Reminders page={page} onPage={(p) => go({ page: p })} />}
      </Card>
      <SellMembershipDialog open={sale !== null} target={sale} onClose={() => setSale(null)} />
      <CollectPaymentDialog open={collect !== null} payable={collect} onClose={() => setCollect(null)} />
    </div>
  );
}
