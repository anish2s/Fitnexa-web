'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, CalendarClock, IndianRupee, MessageCircle, ScanLine, UserPlus, Users, Wallet } from 'lucide-react';
import {
  ActionPill, ActionPillItem, AreaChart, Badge, Button, buttonClasses, Card, CardBody, CardHeader, EmptyState, KpiCard, MiniBars, Skeleton,
} from '@fitexaa/ui';
import { useAuth, useMe } from '@/lib/auth';
import { useDashboard } from '@/lib/queries';
import {
  addDays, change, headerDate, inr, inrShort, METHOD_LABEL, monthLabel, monthStartBefore, num, pct, shortDate, timeAgo, weekStart,
  weekdayLabel, weekdayName,
} from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/page-header';

function greeting(hour: number) {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function KpiSkeleton() {
  return <Skeleton className="h-[150px] rounded-xl" />;
}

export function GymOverview() {
  const me = useMe();
  const { api, can } = useAuth();
  const dashboard = useDashboard();
  const today = dashboard.data?.date;
  const reports = can('reports:read') && !!today;

  // Report ranges are anchored on the gym's own "today" from /dashboard, not the browser clock.
  const yearFrom = today ? monthStartBefore(today, 11) : '';
  const revenue = useQuery({
    queryKey: ['reports', 'revenue', yearFrom, today],
    queryFn: () => api.get('/api/v1/reports/revenue', { query: { from: yearFrom, to: today, groupBy: 'month' } }).then((r) => r.data),
    enabled: reports,
  });
  const growth = useQuery({
    queryKey: ['reports', 'growth', yearFrom, today],
    queryFn: () => api.get('/api/v1/reports/growth', { query: { from: yearFrom, to: today, groupBy: 'month' } }).then((r) => r.data),
    enabled: reports,
  });
  const attFrom = today ? addDays(today, -13) : '';
  const attendance = useQuery({
    queryKey: ['reports', 'attendance', attFrom, today],
    queryFn: () => api.get('/api/v1/reports/attendance', { query: { from: attFrom, to: today, groupBy: 'day' } }).then((r) => r.data),
    enabled: reports,
  });
  const payments = useQuery({
    queryKey: ['payments', 'recent'],
    queryFn: () => api.get('/api/v1/payments', { query: { limit: 5 } }).then((r) => r.data),
    enabled: can('payments:read'),
  });
  const expiring = useQuery({
    queryKey: ['memberships', 'expiring', 'top'],
    queryFn: () => api.get('/api/v1/memberships/expiring', { query: { limit: 5 } }).then((r) => r),
    enabled: can('memberships:read'),
  });

  if (dashboard.isError) {
    return <EmptyState icon={<AlertTriangle />} title="Couldn’t load the overview" description={errorMessage(dashboard.error)} action={<Button onClick={() => dashboard.refetch()}>Try again</Button>} />;
  }

  const d = dashboard.data;
  const firstName = me.user.name.split(' ')[0];
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23' }).format(new Date()));

  // Series
  const growthRows = growth.data?.series ?? [];
  const activeSpark = growthRows.map((r) => r.activeMembers);
  const joinedSpark = growthRows.map((r) => r.joined);
  const attRows = attendance.data?.series ?? [];
  const attSpark = attRows.map((r) => r.checkIns);
  const revenueRows = revenue.data?.series ?? [];
  const lastWeekSameDay = attRows.length >= 8 ? attRows[attRows.length - 8]!.checkIns : undefined;

  // This week Mon–Sun, today highlighted; days after today are shown empty.
  const week = today
    ? Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart(today), i);
        return { day, label: weekdayLabel(day), value: attRows.find((r) => r.period === day)?.checkIns ?? 0 };
      })
    : [];
  const todayIndex = today ? week.findIndex((w) => w.day === today) : -1;

  const activeTrend = activeSpark.length >= 2 ? change(activeSpark.at(-1)!, activeSpark.at(-2)!) : undefined;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow={today ? headerDate(today) : <Skeleton className="h-4 w-36" />}
        title={`${greeting(hour)}, ${firstName}`}
        actions={
          <ActionPill>
            {can('members:create') && <ActionPillItem as={Link} href="/members/new" icon={<UserPlus />} primary>Add member</ActionPillItem>}
            {can('payments:record') && <ActionPillItem as={Link} href="/renewals?tab=dues" icon={<Wallet />}>Record payment</ActionPillItem>}
            {can('attendance:checkin') && <ActionPillItem as={Link} href="/front-desk" icon={<ScanLine />}>Check-in</ActionPillItem>}
          </ActionPill>
        }
      />

      {/* KPIs */}
      <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${d?.revenue ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
        {!d ? (
          [0, 1, 2, 3, 4].map((i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            {d.revenue && (
              <KpiCard
                label={`Revenue (${monthLabel(d.revenue.thisMonth.from)})`}
                value={inr(d.revenue.thisMonth.netPaise)}
                caption={`${inr(d.revenue.lastMonth.netPaise)} in ${monthLabel(d.revenue.lastMonth.from)}`}
                icon={<IndianRupee />}
                spark={revenueRows.length ? revenueRows.map((r) => r.netPaise) : undefined}
              />
            )}
            <KpiCard label="Active members" value={num(d.members.active)} trend={activeTrend} caption={`of ${num(d.members.total)} total`} icon={<Users />} spark={activeSpark.length ? activeSpark : undefined} />
            <KpiCard label="New this month" value={num(d.members.newThisMonth)} caption={joinedSpark.length >= 2 ? `${num(joinedSpark.at(-2)!)} last month` : undefined} icon={<UserPlus />} spark={joinedSpark.length ? joinedSpark : undefined} />
            <KpiCard
              label="Today’s check-ins"
              value={num(d.attendanceToday.checkIns)}
              trend={lastWeekSameDay !== undefined ? change(d.attendanceToday.checkIns, lastWeekSameDay) : undefined}
              caption={`${pct(d.attendanceToday.rate)} of active members`}
              icon={<ScanLine />}
              spark={attSpark.length ? attSpark : undefined}
            />
            <KpiCard
              label="Pending renewals"
              value={num(d.pendingRenewals.expiringSoon)}
              caption={`ending in ${d.pendingRenewals.windowDays} days · ${num(d.pendingRenewals.recentlyLapsed)} lapsed`}
              icon={<CalendarClock />}
              className={d.revenue ? 'col-span-2 md:col-span-1' : undefined}
            />
          </>
        )}
      </div>

      {/* Charts (owner / reports:read) */}
      {reports && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Monthly revenue" description="Net of refunds, last 12 months" />
            <CardBody>
              {revenue.data ? (
                <>
                  <div className="mb-4 flex items-baseline gap-3">
                    <span className="text-3xl font-semibold tracking-tight tabular-nums">{inr(revenue.data.totals.netPaise)}</span>
                    <span className="text-sm text-muted">in 12 months · {num(revenue.data.totals.payments)} {revenue.data.totals.payments === 1 ? 'payment' : 'payments'}</span>
                  </div>
                  <AreaChart
                    data={revenueRows.map((r) => ({ label: monthLabel(r.period), value: r.netPaise }))}
                    format={inrShort}
                    label="Net revenue by month"
                  />
                </>
              ) : (
                <Skeleton className="h-[260px]" />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Check-ins this week" description={today ? `${weekdayName(today)} highlighted` : undefined} />
            <CardBody>{attendance.data ? <MiniBars data={week} highlight={todayIndex} height={236} /> : <Skeleton className="h-[236px]" />}</CardBody>
          </Card>
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {can('payments:read') && (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Recent payments"
              action={<Link href="/payments" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>View all <ArrowUpRight /></Link>}
            />
            {!payments.data ? (
              <div className="flex flex-col gap-3 px-5 pb-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11" />)}</div>
            ) : payments.data.length === 0 ? (
              <EmptyState icon={<IndianRupee />} title="No payments yet" description="Payments recorded at the desk or paid online appear here." className="py-8" />
            ) : (
              <ul className="px-2 pb-2">
                {payments.data.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success-text"><IndianRupee className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">{p.member?.name ?? 'Member'}</p>
                      <p className="truncate text-sm text-muted">{METHOD_LABEL[p.method] ?? p.method} · {p.receiptNumber}{p.refundedPaise ? ` · ${inr(p.refundedPaise)} refunded` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums">{inr(p.amountPaise)}</p>
                      <p className="text-xs text-subtle">{timeAgo(p.receivedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <div className={`flex flex-col gap-4 ${can('payments:read') ? '' : 'lg:col-span-3'}`}>
          {can('memberships:read') && (
            <Card>
              <CardHeader
                title="Renewals due"
                description={d ? `Ending in the next ${d.pendingRenewals.windowDays} days` : undefined}
                action={expiring.data?.meta?.total ? <Badge tone="warning">{num(expiring.data.meta.total)}</Badge> : undefined}
              />
              {!expiring.data ? (
                <div className="flex flex-col gap-2 px-5 pb-5">{[0, 1].map((i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : expiring.data.data.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted">Nothing due. Every membership ending soon has been renewed.</p>
              ) : (
                <ul className="flex flex-col gap-1 px-2 pb-3">
                  {expiring.data.data.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium">{m.member.name}</p>
                        <p className="truncate text-xs text-subtle">{m.plan.name} · ends {shortDate(m.endDate)}</p>
                      </div>
                      <Badge tone={m.daysLeft <= 2 ? 'danger' : 'warning'}>{m.daysLeft}d left</Badge>
                      {m.whatsappUrl && (
                        <a href={m.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`Send ${m.member.name} a renewal reminder on WhatsApp`} className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-fg">
                          <MessageCircle className="size-4" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {d && d.dues.outstandingPaise > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-warning-soft text-warning-text"><AlertTriangle className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted">Dues outstanding</p>
                  <p className="text-lg font-semibold tabular-nums">{inr(d.dues.outstandingPaise)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-subtle">Across {num(d.dues.memberships)} {d.dues.memberships === 1 ? 'membership' : 'memberships'} with part payments</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
