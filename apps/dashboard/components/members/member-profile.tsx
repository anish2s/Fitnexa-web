'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Archive, ArchiveRestore, ArrowLeft, CalendarClock, Mail, Pencil, Phone, ShieldCheck, Smartphone, UserX } from 'lucide-react';
import { Badge, Button, buttonClasses, Card, CardBody, CardHeader, EmptyState, Skeleton, Table, TBody, TD, TH, THead, TR, useToast, type BadgeTone } from '@fitnexa/ui';
import { ApiError, type MemberDetail, type MembershipView } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { useDashboard, useMember } from '@/lib/queries';
import { ageOn, DURATION_LABEL, fullDate, GENDER_LABEL, inr, phone, timeAgo } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { MemberPhoto } from './member-photo';

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

function CurrentMembership({ member }: { member: MemberDetail }) {
  const { status, current, nextStartDate } = member.membership;
  const s = MEMBERSHIP_STATUS[status] ?? MEMBERSHIP_STATUS.none!;
  return (
    <Card>
      <CardHeader title="Membership" action={<Badge tone={s.tone} dot>{s.label}</Badge>} />
      <CardBody>
        {!current ? (
          <p className="text-sm text-muted">No membership yet. Selling memberships arrives with the front desk screens in Milestone 3.</p>
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
                <span className="font-semibold text-warning-text tabular-nums">{inr(current.balancePaise)}</span>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function MembershipHistory({ memberId }: { memberId: string }) {
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
                <TD><Badge tone={MEMBERSHIP_STATUS[m.status]?.tone ?? 'neutral'} dot>{MEMBERSHIP_STATUS[m.status]?.label ?? m.status}</Badge></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
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
            {canEdit && (
              <Link href={`/members/${m.id}/edit`} className={buttonClasses({ variant: 'secondary' })}>
                <Pencil className="size-4" /> Edit
              </Link>
            )}
            {can('members:archive') &&
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
          {can('memberships:read') && <MembershipHistory memberId={m.id} />}
        </div>

        <div className="flex flex-col gap-5 max-lg:order-first">
          <CurrentMembership member={m} />
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
        </div>
      </div>

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
