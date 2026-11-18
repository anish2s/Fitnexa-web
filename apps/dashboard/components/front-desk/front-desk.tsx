'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, CheckCircle2, Clock, IndianRupee, LogIn, QrCode, RefreshCw, ScanLine, Search, UserPlus, XCircle } from 'lucide-react';
import { Avatar, Badge, Button, buttonClasses, Card, CardHeader, EmptyState, Input, Kbd, Skeleton, cn } from '@fitnexa/ui';
import { ApiError, type CheckInResult, type MemberListItem } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { useDebounced } from '@/lib/use-debounced';
import { actionMessage } from '@/lib/errors';
import { fullDate, inr, num, pct, phone } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { CollectPaymentDialog, type Payable } from '@/components/money/collect-payment';
import { SellMembershipDialog, type SaleTarget } from '@/components/money/sell-membership';
import { QrCameraDialog } from './qr-camera';

/** Member passes look like "gp1.<id>.<window>.<sig>"; anything else typed in the box is a search. */
const isPassToken = (s: string) => /^gp1\.[^\s]{10,}$/.test(s.trim());

const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const time = (iso: string) => timeFmt.format(new Date(iso));

type Outcome =
  | { kind: 'ok'; result: CheckInResult }
  | { kind: 'denied'; message: string; reason?: string; member?: { id: string; name: string; memberCode: string; photoUrl: string | null } }
  | { kind: 'error'; message: string };

const STATUS_BADGE: Record<string, { label: string; tone: 'success' | 'warning' | 'info' | 'danger' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  expiring: { label: 'Expiring', tone: 'warning' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  expired: { label: 'Expired', tone: 'danger' },
  none: { label: 'No plan', tone: 'neutral' },
};

function OutcomeCard({ outcome, onRenew, onCollect }: { outcome: Outcome; onRenew: (memberId: string) => void; onCollect: (p: Payable) => void }) {
  const { can } = useAuth();
  if (outcome.kind === 'error') {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft p-4">
        <XCircle className="mt-0.5 size-5 shrink-0 text-danger-text" />
        <p className="text-sm">{outcome.message}</p>
      </div>
    );
  }
  if (outcome.kind === 'denied') {
    const m = outcome.member;
    return (
      <div role="alert" className="flex flex-col gap-4 rounded-xl border border-danger/40 bg-danger-soft p-4 sm:flex-row sm:items-center">
        {m ? <Avatar name={m.name} src={m.photoUrl} size={64} className="text-xl" /> : <XCircle className="size-8 text-danger-text" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-danger-text">Not checked in</p>
          {m && <p className="text-lg font-semibold">{m.name} <span className="text-sm font-normal text-muted tabular-nums">{m.memberCode}</span></p>}
          <p className="text-sm">{outcome.message}</p>
        </div>
        {m && (
          <div className="flex gap-2">
            <Link href={`/members/${m.id}`} className={buttonClasses({ variant: 'secondary' })}>Profile</Link>
            {can('memberships:manage') && outcome.reason !== 'upcoming' && (
              <Button onClick={() => onRenew(m.id)}>{outcome.reason === 'none' ? 'Sell membership' : 'Renew'}</Button>
            )}
          </div>
        )}
      </div>
    );
  }
  const { result } = outcome;
  const fresh = result.status === 'checked_in';
  const ms = result.membership;
  return (
    <div role="status" className={cn('flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center', fresh ? 'border-success/40 bg-success-soft' : 'border-info/40 bg-info-soft')}>
      <Avatar name={result.member.name} src={result.member.photoUrl} size={64} className="text-xl" />
      <div className="min-w-0 flex-1">
        <p className={cn('flex items-center gap-1.5 text-sm font-semibold', fresh ? 'text-success-text' : 'text-info-text')}>
          {fresh ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
          {fresh ? `Checked in at ${time(result.checkIn.checkedInAt)}` : `Already checked in today at ${time(result.checkIn.checkedInAt)}`}
        </p>
        <p className="text-lg font-semibold">
          <Link href={`/members/${result.member.id}`} className="hover:underline">{result.member.name}</Link>{' '}
          <span className="text-sm font-normal text-muted tabular-nums">{result.member.memberCode}</span>
        </p>
        <p className="text-sm text-muted">{ms.plan} · ends {fullDate(ms.endDate)} · {ms.daysLeft} {ms.daysLeft === 1 ? 'day' : 'days'} left</p>
      </div>
      {ms.balancePaise > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 sm:flex-col sm:items-end">
          <span className="text-sm font-semibold text-warning-text tabular-nums">{inr(ms.balancePaise, true)} due</span>
          {can('payments:record') && (
            <Button size="sm" leftIcon={<IndianRupee className="size-3.5" />} onClick={() => onCollect({ membershipId: ms.id, memberId: result.member.id, memberName: result.member.name, planName: ms.plan, balancePaise: ms.balancePaise })}>
              Collect
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResults({ rows, busyId, onCheckIn }: { rows: MemberListItem[]; busyId: string | null; onCheckIn: (m: MemberListItem) => void }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {rows.map((m) => {
        const key = m.membership.status === 'active' && m.membership.expiringSoon ? 'expiring' : m.membership.status;
        const badge = STATUS_BADGE[key] ?? STATUS_BADGE.none!;
        return (
          <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={m.name} src={m.photoUrl} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.name}</p>
              <p className="truncate text-xs text-subtle tabular-nums">{m.memberCode} · {phone(m.phone)}{m.membership.plan ? ` · ${m.membership.plan.name}` : ''}</p>
            </div>
            <Badge tone={badge.tone} dot className="hidden sm:inline-flex">{badge.label}</Badge>
            <Button size="sm" variant={m.membership.status === 'active' ? 'primary' : 'secondary'} leftIcon={<LogIn className="size-3.5" />} loading={busyId === m.id} onClick={() => onCheckIn(m)}>
              Check in
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function Today() {
  const { api } = useAuth();
  const report = useQuery({
    queryKey: ['attendance', 'report'],
    queryFn: () => api.get('/api/v1/attendance/report').then((r) => r.data),
    refetchInterval: 30_000,
  });
  const list = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => api.get('/api/v1/attendance', { query: { limit: 50 } }).then((r) => r),
    refetchInterval: 30_000,
  });
  const rows = list.data?.data ?? [];
  const r = report.data;
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader
        title="Today"
        description={r ? fullDate(r.date) : undefined}
        action={<Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => { void report.refetch(); void list.refetch(); }}><RefreshCw className={cn('size-4', (report.isFetching || list.isFetching) && 'animate-spin')} /></Button>}
      />
      <div className="grid grid-cols-3 gap-2 px-5 pb-4">
        {[
          ['Check-ins', r ? num(r.total) : null],
          ['QR / manual', r ? `${num(r.byMethod.qr)} / ${num(r.byMethod.manual)}` : null],
          ['Of active', r ? pct(r.attendanceRate) : null],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-xs text-muted">{label}</p>
            {value === null ? <Skeleton className="mt-1 h-6 w-12" /> : <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>}
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        {list.isError ? (
          <p className="p-5 text-sm text-muted">{actionMessage(list.error)}</p>
        ) : !list.data ? (
          <div className="flex flex-col gap-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ScanLine />} title="No check-ins yet today" description="Members appear here as they arrive." className="py-10" />
        ) : (
          <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {rows.map((a) => (
              <li key={a.id}>
                <Link href={`/members/${a.member.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-2">
                  <Avatar name={a.member.name} src={a.member.photoUrl} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.member.name}</p>
                    <p className="text-xs text-subtle tabular-nums">{a.member.memberCode}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted tabular-nums">
                    {a.method === 'qr' ? <QrCode className="size-3.5" aria-label="QR" /> : <LogIn className="size-3.5" aria-label="Manual" />}
                    {time(a.checkedInAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/**
 * The front desk: one box for everything. A USB/Bluetooth scanner "types" the pass and presses Enter;
 * typing a name, phone or member code searches instead. The camera button scans with the device camera.
 */
export function FrontDesk() {
  const { api, can } = useAuth();
  const queryClient = useQueryClient();
  const box = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [collect, setCollect] = useState<Payable | null>(null);
  const [sale, setSale] = useState<SaleTarget | null>(null);
  const query = useDebounced(text.trim(), 250);
  const searching = query.length >= 2 && !isPassToken(query);

  const results = useQuery({
    queryKey: ['members', 'desk-search', query],
    queryFn: () => api.get('/api/v1/members', { query: { q: query, limit: 6, sort: 'name' } }).then((r) => r.data),
    enabled: searching,
  });

  const afterCheckIn = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['attendance'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const handle = useCallback(
    async (run: () => Promise<CheckInResult>, member?: { id: string; name: string; memberCode: string; photoUrl: string | null }) => {
      try {
        const result = await run();
        setOutcome({ kind: 'ok', result });
        afterCheckIn();
      } catch (err) {
        if (err instanceof ApiError && err.code === 'NO_ACTIVE_MEMBERSHIP') {
          const reason = (err.details as { reason?: string } | undefined)?.reason;
          setOutcome({ kind: 'denied', message: err.message, reason, member });
        } else {
          setOutcome({ kind: 'error', message: actionMessage(err) });
        }
      }
    },
    [afterCheckIn],
  );

  const scan = useCallback(
    async (token: string) => {
      setBusy('scan');
      await handle(() => api.post('/api/v1/attendance/scan', { body: { token: token.trim() } }).then((r) => r.data));
      setBusy(null);
      setText('');
      box.current?.focus();
    },
    [api, handle],
  );

  async function checkIn(m: MemberListItem) {
    setBusy(m.id);
    await handle(() => api.post('/api/v1/attendance/manual', { body: { memberId: m.id } }).then((r) => r.data), m);
    setBusy(null);
    setText('');
    box.current?.focus();
  }

  // Keep the box focused so a USB scanner always types into it.
  useEffect(() => {
    box.current?.focus();
  }, []);

  async function openSale(memberId: string) {
    try {
      const { data } = await api.get('/api/v1/members/{id}', { params: { id: memberId } });
      setSale({ memberId, memberName: data.name, summary: data.membership });
    } catch (err) {
      setOutcome({ kind: 'error', message: actionMessage(err) });
    }
  }

  const onCode = useCallback(
    (code: string) => {
      setCamera(false);
      void scan(code);
    },
    [scan],
  );

  const rows = results.data ?? [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        title="Front desk"
        description="Check members in, sell and renew memberships, take payments."
        actions={can('members:create') && <Link href="/members/new" className={buttonClasses({ variant: 'secondary' })}><UserPlus className="size-4" /> Add member</Link>}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-4 sm:p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = text.trim();
                if (isPassToken(v)) void scan(v);
                else if (rows.length === 1 && searching) void checkIn(rows[0]!);
              }}
              className="flex gap-2"
            >
              <Input
                ref={box}
                leftIcon={busy === 'scan' ? <RefreshCw className="animate-spin" /> : <Search />}
                placeholder="Scan a pass or search members"
                aria-label="Scan a pass or search members"
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="h-12 text-md"
                wrapperClassName="flex-1"
              />
              <Button type="button" variant="secondary" size="lg" className="h-12 shrink-0" leftIcon={<Camera className="size-5" />} onClick={() => setCamera(true)}>
                <span className="hidden sm:inline">Camera</span>
              </Button>
            </form>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
              A USB scanner works here directly. With one match, <Kbd>Enter</Kbd> checks them in.
            </p>
          </Card>

          {outcome && <OutcomeCard outcome={outcome} onRenew={openSale} onCollect={setCollect} />}

          {searching && (
            results.isError ? (
              <p className="text-sm text-muted"><AlertTriangle className="mr-1 inline size-4" />{actionMessage(results.error)}</p>
            ) : !results.data ? (
              <div className="flex flex-col gap-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : rows.length === 0 ? (
              <Card><EmptyState icon={<Search />} title="No member found" description={`Nothing matches “${query}”.`} action={can('members:create') && <Link href="/members/new" className={buttonClasses()}><UserPlus className="size-4" /> Add member</Link>} className="py-8" /></Card>
            ) : (
              <SearchResults rows={rows} busyId={busy} onCheckIn={checkIn} />
            )
          )}

          {!searching && !outcome && (
            <Card>
              <EmptyState icon={<ScanLine />} title="Ready for check-ins" description="Scan the QR pass in the member app, or search for the member. Only members with a membership active today are let in." className="py-10" />
            </Card>
          )}
        </div>

        <Today />
      </div>

      <QrCameraDialog open={camera} onClose={() => setCamera(false)} onCode={onCode} />
      <CollectPaymentDialog open={collect !== null} payable={collect} onClose={() => setCollect(null)} />
      <SellMembershipDialog open={sale !== null} target={sale} onClose={() => setSale(null)} />
    </div>
  );
}
