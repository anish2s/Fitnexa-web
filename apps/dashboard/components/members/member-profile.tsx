'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Archive, Download, Eraser, ArchiveRestore, ArrowLeft, ArrowUpRight, Ban, CalendarClock, IndianRupee, LogIn, Mail, Pencil, Phone, QrCode, RefreshCw, ShieldCheck, ShoppingBag, Smartphone, UserX } from 'lucide-react';
import { Badge, Button, buttonClasses, Card, CardBody, CardHeader, EmptyState, Input, Skeleton, Table, TBody, TD, TH, THead, TR, Textarea, useToast, type BadgeTone } from '@fitexaa/ui';
import { ApiError, type MemberDetail, type MembershipView } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { useDashboard, useMember } from '@/lib/queries';
import { ageOn, DURATION_LABEL, fullDate, GENDER_LABEL, inr, METHOD_LABEL, phone, timeAgo } from '@/lib/format';
import { actionMessage, errorMessage } from '@/lib/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { MemberPhoto } from './member-photo';
import { CollectPaymentDialog, payableOf, useMoneyRefresh, type Payable } from '@/components/money/collect-payment';
import { SellMembershipDialog, type SaleTarget } from '@/components/money/sell-membership';
import { PaymentDetailDialog, formatWhen } from '@/components/money/payment-detail';

export const MEMBERSHIP_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  expired: { label: 'Expired', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  none: { label: 'No membership', tone: 'neutral' },
};

const PAYMENT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  partial: { label: 'Part paid', tone: 'warning' },
  unpaid: { label: 'Unpaid', tone: 'danger' },
  overpaid: { label: 'Overpaid', tone: 'info' },
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5 text-sm sm:grid-cols-[150px_1fr]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-fg">{children}</dd>
    </div>
  );
}

const none = <span className="text-subtle">Not recorded</span>;

function CurrentMembership({ member, onSell, onCollect }: { member: MemberDetail; onSell?: () => void; onCollect?: (p: Payable) => void }) {
  const { status, current, nextStartDate } = member.membership;
  const s = MEMBERSHIP_STATUS[status] ?? MEMBERSHIP_STATUS.none!;
  return (
    <Card>
      <CardHeader title="Membership" action={<Badge tone={s.tone} dot>{s.label}</Badge>} />
      <CardBody>
        {!current ? (
          <p className="text-sm text-muted">No membership yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-lg font-semibold">{current.plan.name}</p>
              <p className="text-sm text-muted">{DURATION_LABEL[current.plan.duration] ?? current.plan.duration} · {inr(current.totalPaise)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs text-muted">{status === 'upcoming' ? 'Starts' : 'Started'}</p>
                <p className="mt-0.5 font-medium">{fullDate(current.startDate)}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs text-muted">{status === 'expired' ? 'Ended' : 'Ends'}</p>
                <p className="mt-0.5 font-medium">{fullDate(current.endDate)}</p>
              </div>
            </div>
            {current.daysLeft !== null && (
              <p className="flex items-center gap-2 text-sm">
                <CalendarClock className="size-4 text-muted" />
                {status === 'upcoming' ? `Starts in ${current.daysLeft} ${current.daysLeft === 1 ? 'day' : 'days'}` : `${current.daysLeft} ${current.daysLeft === 1 ? 'day' : 'days'} left, including today`}
              </p>
            )}
            {nextStartDate && <p className="text-sm text-muted">Renewal already booked from {fullDate(nextStartDate)}.</p>}
            {current.balancePaise > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm">
                <span>Balance due</span>
                <span className="font-semibold text-warning-text tabular-nums">{inr(current.balancePaise, true)}</span>
              </div>
            )}
          </div>
        )}
        {(onSell || (onCollect && current && current.balancePaise > 0)) && (
          <div className="mt-4 flex gap-2 [&>*]:flex-1">
            {onCollect && current && current.balancePaise > 0 && (
              <Button variant="secondary" leftIcon={<IndianRupee className="size-4" />} onClick={() => onCollect(payableOf(current, member.name))}>Collect</Button>
            )}
            {onSell && (
              <Button leftIcon={current ? <RefreshCw className="size-4" /> : <ShoppingBag className="size-4" />} onClick={onSell}>{current ? 'Renew' : 'Sell membership'}</Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function MembershipHistory({ memberId, onCollect, onCancel }: { memberId: string; onCollect?: (m: MembershipView) => void; onCancel?: (m: MembershipView) => void }) {
  const { api } = useAuth();
  const history = useQuery({
    queryKey: ['member', memberId, 'memberships'],
    queryFn: () => api.get('/api/v1/members/{id}/memberships', { params: { id: memberId } }).then((r) => r.data.items),
  });
  const rows: MembershipView[] = history.data ?? [];
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Membership history" />
      {history.isError ? (
        <p className="px-5 pb-5 text-sm text-muted">{errorMessage(history.error)}</p>
      ) : !history.data ? (
        <div className="flex flex-col gap-2 px-5 pb-5">{[0, 1].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">No memberships sold yet.</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Plan</TH>
              <TH>Period</TH>
              <TH className="hidden text-right sm:table-cell">Total</TH>
              <TH className="hidden sm:table-cell">Payment</TH>
              <TH>Status</TH>
              {(onCollect || onCancel) && <TH className="w-10"><span className="sr-only">Actions</span></TH>}
            </tr>
          </THead>
          <TBody>
            {rows.map((m) => (
              <TR key={m.id}>
                <TD className="font-medium">{m.plan.name}</TD>
                <TD className="text-muted">
                  <span className="whitespace-nowrap">{fullDate(m.startDate)} –</span> <span className="whitespace-nowrap">{fullDate(m.endDate)}</span>
                </TD>
                <TD className="hidden text-right tabular-nums sm:table-cell">{inr(m.totalPaise)}</TD>
                <TD className="hidden sm:table-cell">
                  <Badge tone={PAYMENT_STATUS[m.paymentStatus]?.tone ?? 'neutral'}>{PAYMENT_STATUS[m.paymentStatus]?.label ?? m.paymentStatus}</Badge>
                </TD>
                <TD>
                  <Badge tone={MEMBERSHIP_STATUS[m.status]?.tone ?? 'neutral'} dot>{MEMBERSHIP_STATUS[m.status]?.label ?? m.status}</Badge>
                  {m.status === 'cancelled' && m.cancelReason && <p className="mt-1 max-w-48 truncate text-xs text-subtle" title={m.cancelReason}>{m.cancelReason}</p>}
                </TD>
                {(onCollect || onCancel) && (
                  <TD>
                    <div className="flex justify-end gap-1">
                      {onCollect && m.status !== 'cancelled' && m.balancePaise > 0 && (
                        <Button size="sm" variant="secondary" onClick={() => onCollect(m)} aria-label={`Collect ${inr(m.balancePaise, true)}`}>
                          <IndianRupee className="size-3.5" /> <span className="tabular-nums">{inr(m.balancePaise)}</span>
                        </Button>
                      )}
                      {onCancel && (m.status === 'active' || m.status === 'upcoming') && (
                        <Button size="icon" variant="ghost" onClick={() => onCancel(m)} aria-label={`Cancel ${m.plan.name} membership`} title="Cancel membership"><Ban className="size-4" /></Button>
                      )}
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function MemberPayments({ memberId, onOpen }: { memberId: string; onOpen: (paymentId: string) => void }) {
  const { api } = useAuth();
  const q = useQuery({
    queryKey: ['payments', 'member', memberId],
    queryFn: () => api.get('/api/v1/members/{id}/payments', { params: { id: memberId } }).then((r) => r.data),
  });
  const rows = (q.data ?? []).slice(0, 8);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Payments"
        action={(q.data?.length ?? 0) > 0 && <Link href={`/payments?member=${memberId}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>All <ArrowUpRight className="size-4" /></Link>}
      />
      {q.isError ? (
        <p className="px-5 pb-5 text-sm text-muted">{errorMessage(q.error)}</p>
      ) : !q.data ? (
        <div className="flex flex-col gap-2 px-5 pb-5">{[0, 1].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">No payments yet.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {rows.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onOpen(p.id)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium tabular-nums">{p.receiptNumber}</p>
                  <p className="text-xs text-muted">{formatWhen(p.receivedAt)} · {METHOD_LABEL[p.method] ?? p.method}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">{inr(p.amountPaise, true)}</p>
                  {p.refundedPaise > 0 && <p className="text-xs text-danger-text tabular-nums">−{inr(p.refundedPaise, true)}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const visitTime = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

function MemberVisits({ memberId }: { memberId: string }) {
  const { api } = useAuth();
  const q = useQuery({
    queryKey: ['attendance', 'member', memberId],
    queryFn: () => api.get('/api/v1/members/{id}/attendance', { params: { id: memberId }, query: { limit: 10 } }).then((r) => r),
  });
  const rows = q.data?.data ?? [];
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Recent visits" description={q.data?.meta?.total ? `${q.data.meta.total} in total` : undefined} />
      {q.isError ? (
        <p className="px-5 pb-5 text-sm text-muted">{errorMessage(q.error)}</p>
      ) : !q.data ? (
        <div className="flex flex-col gap-2 px-5 pb-5">{[0, 1].map((i) => <Skeleton key={i} className="h-8" />)}</div>
      ) : rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">No visits yet.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {rows.map((v) => (
            <li key={v.id} className="flex items-center justify-between px-5 py-2 text-sm">
              <span>{fullDate(v.day)}</span>
              <span className="flex items-center gap-1.5 text-muted tabular-nums">
                {v.method === 'qr' ? <QrCode className="size-3.5" aria-label="QR" /> : <LogIn className="size-3.5" aria-label="Manual" />}
                {visitTime.format(new Date(v.checkedInAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CancelMembershipDialog({ membership, onClose }: { membership: MembershipView | null; onClose: () => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const refresh = useMoneyRefresh();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <ConfirmDialog
      open={membership !== null}
      onClose={() => { setReason(''); setError(null); onClose(); }}
      title="Cancel this membership?"
      description={membership ? `${membership.plan.name}, ${fullDate(membership.startDate)} – ${fullDate(membership.endDate)}` : undefined}
      confirmLabel="Cancel membership"
      tone="danger"
      onConfirm={async () => {
        if (reason.trim().length < 3) {
          setError('Say why (at least 3 characters)');
          return false;
        }
        await api.post('/api/v1/memberships/{id}/cancel', { params: { id: membership!.id }, body: { reason: reason.trim() } });
        refresh(membership!.memberId);
        toast.show({ tone: 'success', title: 'Membership cancelled' });
        setReason('');
      }}
    >
      <p>The member can no longer check in on it. Payments already taken are not refunded automatically: refund them from Payments if needed.</p>
      <Textarea label="Reason" required rows={2} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} error={error ?? undefined} placeholder="e.g. Member moved city" />
    </ConfirmDialog>
  );
}

/** DPDP tools for the owner: download everything held about the member, or erase their personal data. */
function MemberPrivacy({ member }: { member: MemberDetail }) {
  const { api, state } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [erasing, setErasing] = useState(false);
  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ code?: string; reason?: string }>({});
  const [exporting, setExporting] = useState(false);
  const impersonated = state.status === 'signedIn' && Boolean(state.me.impersonatedBy);
  const erased = member.name.startsWith('Erased member');

  async function exportData() {
    setExporting(true);
    try {
      const blob = await api.download('/api/v1/members/{id}/export', { params: { id: member.id } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `member-${member.memberCode}-data.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show({ tone: 'success', title: 'Data downloaded', description: 'Share it only with the member. The download is recorded in the audit log.' });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t export the data', description: actionMessage(err) });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Member data" description="The member’s rights under India’s data protection law (DPDP)." />
      <CardBody className="flex flex-col gap-2">
        <Button variant="secondary" leftIcon={<Download className="size-4" />} loading={exporting} onClick={exportData}>Download their data</Button>
        {!erased && (
          <Button variant="ghost" className="text-danger-text" leftIcon={<Eraser className="size-4" />} disabled={impersonated} title={impersonated ? 'Not available in a support session' : undefined} onClick={() => setErasing(true)}>
            Erase personal data
          </Button>
        )}
      </CardBody>
      <ConfirmDialog
        open={erasing}
        onClose={() => { setErasing(false); setCode(''); setReason(''); setErrors({}); }}
        title={`Erase ${member.name}’s personal data?`}
        confirmLabel="Erase permanently"
        tone="danger"
        onConfirm={async () => {
          const next: typeof errors = {};
          if (code.trim().toUpperCase() !== member.memberCode) next.code = `Type ${member.memberCode} to confirm`;
          if (reason.trim().length < 5) next.reason = 'Say why (at least 5 characters)';
          setErrors(next);
          if (next.code || next.reason) return false;
          await api.post('/api/v1/members/{id}/erase', { params: { id: member.id }, body: { confirmMemberCode: code.trim().toUpperCase(), reason: reason.trim() } });
          await queryClient.invalidateQueries({ queryKey: ['member', member.id] });
          void queryClient.invalidateQueries({ queryKey: ['members'] });
          toast.show({ tone: 'success', title: 'Personal data erased', description: `${member.memberCode} is kept, anonymised, for tax records.` });
        }}
      >
        <p className="font-medium text-danger-text">This can’t be undone.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Removed: name, phone, email, date of birth, gender, emergency contact, notes, photo, app sign-in and reminders.</li>
          <li>Kept, anonymised: member code, memberships, payments and receipts (tax records), visit dates, consent record.</li>
          <li>The member is archived for good. Their phone and email can be used by a new registration.</li>
        </ul>
        <Input label={`Type ${member.memberCode} to confirm`} value={code} onChange={(e) => { setCode(e.target.value); setErrors((x) => ({ ...x, code: undefined })); }} autoComplete="off" className="font-mono uppercase" error={errors.code} />
        <Textarea label="Reason" rows={2} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: undefined })); }} placeholder="e.g. Member asked by email on 18 Nov to delete their data" error={errors.reason} />
      </ConfirmDialog>
    </Card>
  );
}

export function MemberProfile({ id }: { id: string }) {
  const { api, can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const member = useMember(id);
  const today = useDashboard().data?.date;
  const [confirm, setConfirm] = useState<'archive' | 'restore' | null>(null);
  const [sale, setSale] = useState<SaleTarget | null>(null);
  const [collect, setCollect] = useState<Payable | null>(null);
  const [cancelling, setCancelling] = useState<MembershipView | null>(null);
  const [openPayment, setOpenPayment] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  if (member.isError) {
    const gone = member.error instanceof ApiError && (member.error.status === 404 || member.error.code === 'VALIDATION_ERROR');
    return (
      <Card className="mx-auto max-w-5xl">
        <EmptyState
          icon={gone ? <UserX /> : <AlertTriangle />}
          title={gone ? 'Member not found' : 'Couldn’t load this member'}
          description={gone ? 'This member doesn’t exist in this gym, or the link is wrong.' : errorMessage(member.error)}
          action={gone ? <Link href="/members" className={buttonClasses()}>Back to members</Link> : <Button onClick={() => member.refetch()}>Try again</Button>}
        />
      </Card>
    );
  }
  if (!member.data) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-5" aria-busy>
        <Skeleton className="h-28" />
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><Skeleton className="h-80" /><Skeleton className="h-60" /></div>
      </div>
    );
  }

  const m = member.data;
  const archived = Boolean(m.archivedAt);
  const canEdit = can('members:update') && !archived;
  const canSell = can('memberships:manage') && !archived;
  const canCollect = can('payments:record');
  const canCheckIn = can('attendance:checkin') && !archived && m.membership.status === 'active';

  async function checkIn() {
    setCheckingIn(true);
    try {
      const { data } = await api.post('/api/v1/attendance/manual', { body: { memberId: m.id } });
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.show(data.status === 'checked_in' ? { tone: 'success', title: `${m.name} checked in` } : { tone: 'info', title: 'Already checked in today' });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Not checked in', description: actionMessage(err) });
    } finally {
      setCheckingIn(false);
    }
  }

  async function setArchived(archive: boolean) {
    const { data } = await api.post(archive ? '/api/v1/members/{id}/archive' : '/api/v1/members/{id}/restore', { params: { id } });
    queryClient.setQueryData(['member', id], data);
    await queryClient.invalidateQueries({ queryKey: ['members'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    toast.show({ tone: 'success', title: archive ? `${data.name} archived` : `${data.name} restored` });
  }

  const ec = m.emergencyContact;
  const app = m.appAccess;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Link href="/members" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Members
      </Link>

      {archived && (
        <div role="status" className="flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
          <Archive className="mt-0.5 size-4 shrink-0 text-warning-text" />
          <p>
            <span className="font-medium">Archived on {fullDate(m.archivedAt!.slice(0, 10))}.</span>{' '}
            <span className="text-muted">Their history is kept and their phone and email stay reserved. Restore them to edit, sell a membership or check them in.</span>
          </p>
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <MemberPhoto member={m} editable={canEdit} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-semibold tracking-tight">{m.name}</h1>
              {archived && <Badge tone="neutral">Archived</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted tabular-nums">
              {m.memberCode} · Member since {fullDate(m.joinDate)}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm sm:justify-start">
              {m.phone && (
                <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 text-fg hover:text-accent-text">
                  <Phone className="size-4 text-muted" /> <span className="tabular-nums">{phone(m.phone)}</span>
                </a>
              )}
              {m.email && (
                <a href={`mailto:${m.email}`} className="inline-flex min-w-0 items-center gap-1.5 text-fg hover:text-accent-text">
                  <Mail className="size-4 shrink-0 text-muted" /> <span className="truncate">{m.email}</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-2 sm:flex-col sm:items-stretch lg:flex-row">
            {canCheckIn && (
              <Button variant="secondary" leftIcon={<LogIn className="size-4" />} loading={checkingIn} onClick={checkIn}>Check in</Button>
            )}
            {canEdit && (
              <Link href={`/members/${m.id}/edit`} className={buttonClasses({ variant: 'secondary' })}>
                <Pencil className="size-4" /> Edit
              </Link>
            )}
            {can('members:archive') && !m.name.startsWith('Erased member') &&
              (archived ? (
                <Button variant="secondary" leftIcon={<ArchiveRestore className="size-4" />} onClick={() => setConfirm('restore')}>Restore</Button>
              ) : (
                <Button variant="ghost" leftIcon={<Archive className="size-4" />} onClick={() => setConfirm('archive')}>Archive</Button>
              ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="pt-0">
              <dl className="divide-y divide-border">
                <Row label="Gender">{m.gender ? GENDER_LABEL[m.gender] : none}</Row>
                <Row label="Date of birth">
                  {m.dateOfBirth ? <>{fullDate(m.dateOfBirth)}{today && <span className="text-muted"> · {ageOn(m.dateOfBirth, today)} years</span>}</> : none}
                </Row>
                <Row label="Joined">{fullDate(m.joinDate)}</Row>
                <Row label="Emergency contact">
                  {ec ? (
                    <>
                      {ec.name}{ec.relation && <span className="text-muted"> ({ec.relation})</span>}
                      {ec.phone && <a href={`tel:${ec.phone}`} className="block text-muted tabular-nums hover:text-accent-text">{phone(ec.phone)}</a>}
                    </>
                  ) : none}
                </Row>
                <Row label="Staff notes">{m.notes ? <span className="whitespace-pre-line">{m.notes}</span> : <span className="text-subtle">None</span>}</Row>
              </dl>
            </CardBody>
          </Card>
          {can('memberships:read') && (
            <MembershipHistory
              memberId={m.id}
              onCollect={canCollect ? (ms) => setCollect(payableOf(ms, m.name)) : undefined}
              onCancel={can('memberships:manage') ? setCancelling : undefined}
            />
          )}
          {can('payments:read') && <MemberPayments memberId={m.id} onOpen={setOpenPayment} />}
        </div>

        <div className="flex flex-col gap-5 max-lg:order-first">
          <CurrentMembership
            member={m}
            onSell={canSell ? () => setSale({ memberId: m.id, memberName: m.name, summary: m.membership }) : undefined}
            onCollect={canCollect && !archived ? setCollect : undefined}
          />
          {can('attendance:read') && <MemberVisits memberId={m.id} />}
          <Card>
            <CardHeader title="Member app" action={<Badge tone={app.enabled ? 'success' : 'neutral'} dot>{app.enabled ? 'On' : 'Off'}</Badge>} />
            <CardBody className="flex gap-3 pt-0 text-sm">
              <Smartphone className="mt-0.5 size-4 shrink-0 text-muted" />
              <p className="text-muted">
                {app.enabled
                  ? app.lastLoginAt ? `Signs in with their email. Last signed in ${timeAgo(app.lastLoginAt)}.` : 'Can sign in with their email. Hasn’t signed in yet.'
                  : app.reason === 'archived' ? 'Turned off while the member is archived.'
                  : app.reason === 'no_email' ? 'Add an email to let them use the member app.'
                  : 'Their app sign-in is switched off.'}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Consent" />
            <CardBody className="flex gap-3 pt-0 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success-text" />
              <p className="text-muted">
                {m.consent ? <>Recorded {fullDate(m.consent.at.slice(0, 10))} (wording {m.consent.version}).</> : 'No consent on record.'}
              </p>
            </CardBody>
          </Card>
          {can('privacy:manage') && <MemberPrivacy member={m} />}
        </div>
      </div>

      <SellMembershipDialog open={sale !== null} target={sale} onClose={() => setSale(null)} />
      <CollectPaymentDialog open={collect !== null} payable={collect} onClose={() => setCollect(null)} />
      <CancelMembershipDialog membership={cancelling} onClose={() => setCancelling(null)} />
      <PaymentDetailDialog paymentId={openPayment} onClose={() => setOpenPayment(null)} />
      <ConfirmDialog
        open={confirm === 'archive'}
        onClose={() => setConfirm(null)}
        title={`Archive ${m.name}?`}
        confirmLabel="Archive member"
        tone="danger"
        onConfirm={() => setArchived(true)}
      >
        <ul className="list-disc space-y-1 pl-5">
          <li>They move to the Archived list; nothing is deleted.</li>
          <li>Their member app sign-in stops straight away.</li>
          <li>You can restore them at any time.</li>
        </ul>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'restore'}
        onClose={() => setConfirm(null)}
        title={`Restore ${m.name}?`}
        confirmLabel="Restore member"
        onConfirm={() => setArchived(false)}
      >
        <p>They return to the members list{m.email ? ' and can sign in to the member app again' : ''}.</p>
      </ConfirmDialog>
    </div>
  );
}
