import type { Metadata } from 'next';
import { CalendarClock, CheckCircle2, Clock, MessageCircle, QrCode, RefreshCw, ScanLine, Search, Wallet, XCircle } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, Input, Kbd } from '@fitexaa/ui';
import { PreviewShell, previewHref } from '../_components/preview-shell';
import { AppShell } from '../_components/app-shell';
import { SampleTag } from '../_components/sample-tag';
import { MEMBERS, TODAY_CHECKINS, inr, parseParams } from '../_lib/sample';

export const metadata: Metadata = { title: 'Front desk · Design preview' };

export default async function FrontDesk({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = parseParams(await searchParams);
  const { gym, theme } = params;
  const expiring = MEMBERS.filter((m) => m.status === 'expiring' || m.status === 'expired');

  return (
    <PreviewShell params={params} page="front-desk">
      <AppShell
        kind="staff"
        active="front-desk"
        gymName={gym.name}
        userName={gym.staff}
        userRole="Front desk"
        theme={theme}
        themeHref={previewHref('front-desk', { theme: theme === 'dark' ? 'light' : 'dark', gym: gym.key })}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Front desk</h1>
                <SampleTag />
              </div>
              <p className="mt-1 text-sm text-muted">Tuesday, 17 November · 18:44</p>
            </div>
            {/* Staff see attendance numbers, never revenue (owner's numbers). */}
            <div className="flex gap-2 text-sm">
              <span className="rounded-lg border border-border bg-surface px-3 py-1.5"><span className="font-semibold tabular-nums">142</span> <span className="text-muted">check-ins today</span></span>
              <span className="rounded-lg border border-border bg-surface px-3 py-1.5"><span className="text-muted">Busiest</span> <span className="font-semibold">18:00–19:00</span></span>
            </div>
          </div>

          {/* Check-in console */}
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                leftIcon={<Search />}
                placeholder="Name, phone or member code"
                aria-label="Find member to check in"
                className="h-11 text-md"
                wrapperClassName="flex-1"
                rightSlot={<span className="hidden gap-0.5 sm:flex"><Kbd>/</Kbd></span>}
              />
              <Button size="lg" leftIcon={<QrCode className="size-5" />}>Scan member QR</Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {/* Admitted */}
              <div className="rounded-xl border border-success/40 bg-success-soft p-4">
                <div className="flex items-start gap-4">
                  <Avatar name="Kabir Singh" size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircle2 className="size-5 text-success-text" />
                      <p className="text-md font-semibold text-success-text">Checked in · 18:37</p>
                    </div>
                    <p className="mt-1 text-lg font-semibold">Kabir Singh</p>
                    <p className="text-sm text-muted">M0377 · Yearly · ends 02 Aug 2027 · 258 days left</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/50 bg-surface px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-warning-text"><Wallet className="size-4" />Balance due {inr(500000)}</span>
                  <Button size="sm" variant="secondary">Collect payment</Button>
                </div>
              </div>

              {/* Refused: NO_ACTIVE_MEMBERSHIP */}
              <div className="rounded-xl border border-danger/40 bg-danger-soft p-4">
                <div className="flex items-start gap-4">
                  <Avatar name="Meera Pillai" size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <XCircle className="size-5 text-danger-text" />
                      <p className="text-md font-semibold text-danger-text">Not admitted</p>
                    </div>
                    <p className="mt-1 text-lg font-semibold">Meera Pillai</p>
                    <p className="text-sm text-muted">M0365 · Membership expired on 10 Nov 2026</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" leftIcon={<RefreshCw className="size-4" />}>Renew now</Button>
                  <Button size="sm" variant="secondary" leftIcon={<MessageCircle className="size-4" />}>WhatsApp</Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Today's check-ins" description="Newest first" action={<Badge tone="accent" dot>142</Badge>} />
              <ul className="px-2 pb-2">
                {TODAY_CHECKINS.map((c) => (
                  <li key={c.code} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-2">
                    <Avatar name={c.name} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-subtle">{c.code}</p>
                    </div>
                    <Badge tone={c.method === 'QR' ? 'accent' : 'neutral'}>{c.method === 'QR' ? <ScanLine className="size-3" /> : null}{c.method}</Badge>
                    <span className="flex w-14 items-center justify-end gap-1 text-sm text-muted tabular-nums"><Clock className="size-3.5" />{c.time}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Renewals to chase" description="Send a reminder from the desk WhatsApp" action={<CalendarClock className="size-4 text-subtle" />} />
              <CardBody className="flex flex-col gap-2">
                {expiring.map((m) => (
                  <div key={m.code} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="text-xs text-subtle">{m.plan} · {m.status === 'expired' ? `ended ${m.endDate}` : `ends ${m.endDate}`}</p>
                    </div>
                    <Badge tone={m.status === 'expired' ? 'danger' : 'warning'}>{m.status === 'expired' ? 'Lapsed' : `${m.daysLeft}d`}</Badge>
                    <Button variant="secondary" size="icon" aria-label={`WhatsApp ${m.name}`}><MessageCircle className="size-4" /></Button>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      </AppShell>
    </PreviewShell>
  );
}
