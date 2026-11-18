import type { Metadata } from 'next';
import {
  AlertTriangle, ArrowUpRight, CalendarClock, CreditCard, IndianRupee, ScanLine, Undo2, UserPlus, Users, Wallet,
} from 'lucide-react';
import {
  ActionPill, ActionPillItem, AreaChart, Badge, Button, Card, CardBody, CardHeader, KpiCard, MiniBars, Segmented,
} from '@fitexaa/ui';
import { PreviewShell, previewHref } from '../_components/preview-shell';
import { AppShell } from '../_components/app-shell';
import { SampleTag } from '../_components/sample-tag';
import { ACTIVITY, CHECKINS_WEEK, MEMBERS, parseParams, REVENUE_12M, SPARKS, TODAY_INDEX, inr, inrShort } from '../_lib/sample';

export const metadata: Metadata = { title: 'Owner overview · Design preview' };

const activityIcon = {
  payment: { icon: <IndianRupee />, cls: 'bg-success-soft text-success-text' },
  checkin: { icon: <ScanLine />, cls: 'bg-accent-soft text-accent-text' },
  member: { icon: <UserPlus />, cls: 'bg-info-soft text-info-text' },
  expiring: { icon: <CalendarClock />, cls: 'bg-warning-soft text-warning-text' },
  refund: { icon: <Undo2 />, cls: 'bg-danger-soft text-danger-text' },
} as const;

export default async function OwnerOverview({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = parseParams(await searchParams);
  const { gym, theme } = params;
  const expiring = MEMBERS.filter((m) => m.status === 'expiring');

  return (
    <PreviewShell params={params} page="owner">
      <AppShell
        kind="owner"
        active="overview"
        gymName={gym.name}
        userName={gym.owner}
        userRole="Owner"
        theme={theme}
        themeHref={previewHref('owner', { theme: theme === 'dark' ? 'light' : 'dark', gym: gym.key })}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted">Tuesday, 17 November</p>
                <SampleTag />
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Good evening, {gym.owner.split(' ')[0]}</h1>
            </div>
            <ActionPill className="self-start md:self-auto">
              <ActionPillItem icon={<UserPlus />} primary>Add member</ActionPillItem>
              <ActionPillItem icon={<Wallet />}>Record payment</ActionPillItem>
              <ActionPillItem icon={<ScanLine />}>Check-in</ActionPillItem>
            </ActionPill>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Revenue (Nov)" value={inr(34250000)} trend={12.3} caption="vs ₹3,05,000 in Oct" icon={<IndianRupee />} spark={SPARKS.revenue} />
            <KpiCard label="Active members" value="486" trend={3.2} caption="of 532 total" icon={<Users />} spark={SPARKS.active} />
            <KpiCard label="New this month" value="38" trend={22.6} caption="31 last month" icon={<UserPlus />} spark={SPARKS.newMembers} />
            <KpiCard label="Today's check-ins" value="142" trend={-4.7} caption="29% of active members" icon={<ScanLine />} spark={SPARKS.attendance} />
            <KpiCard label="Pending renewals" value="24" trend={-11.1} trendInvert caption="ending in 7 days · 9 lapsed" icon={<CalendarClock />} spark={SPARKS.renewals} sparkColor="var(--warning)" className="col-span-2 md:col-span-1" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Monthly revenue"
                description="Net of refunds, last 12 months"
                action={<Segmented value="12m" options={[{ value: '30d', label: '30D' }, { value: '3m', label: '3M' }, { value: '12m', label: '12M' }]} />}
              />
              <CardBody>
                <div className="mb-4 flex items-baseline gap-3">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums">{inr(355300000)}</span>
                  <span className="text-sm text-muted">this year</span>
                </div>
                <AreaChart data={REVENUE_12M} format={inrShort} label="Revenue by month" />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Check-ins this week" description="Today highlighted" action={<Badge tone="accent" dot>Live</Badge>} />
              <CardBody>
                <MiniBars data={CHECKINS_WEEK} highlight={TODAY_INDEX} height={236} />
              </CardBody>
            </Card>
          </div>

          {/* Lists */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Recent activity" action={<Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="size-4" />}>View all</Button>} />
              <ul className="px-2 pb-2">
                {ACTIVITY.map((a) => (
                  <li key={a.title + a.time} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4 ${activityIcon[a.kind].cls}`}>{activityIcon[a.kind].icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium">{a.title}</p>
                      <p className="truncate text-sm text-muted">{a.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-subtle">{a.time}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader title="Renewals due" description="Ending in the next 7 days" action={<Badge tone="warning">24</Badge>} />
                <ul className="flex flex-col gap-1 px-2 pb-3">
                  {expiring.map((m) => (
                    <li key={m.code} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-surface-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">{m.name}</p>
                        <p className="text-xs text-subtle">{m.plan} · ends {m.endDate}</p>
                      </div>
                      <Badge tone={m.daysLeft! <= 2 ? 'danger' : 'warning'}>{m.daysLeft}d left</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-warning-soft text-warning-text"><AlertTriangle className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">Dues outstanding</p>
                    <p className="text-lg font-semibold tabular-nums">{inr(1840000)}</p>
                  </div>
                  <Button variant="secondary" size="sm" leftIcon={<CreditCard className="size-4" />}>Collect</Button>
                </div>
                <p className="mt-2 text-xs text-subtle">Across 11 memberships with part payments</p>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </PreviewShell>
  );
}
