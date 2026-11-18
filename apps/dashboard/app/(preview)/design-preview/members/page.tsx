import type { Metadata } from 'next';
import { ChevronLeft, ChevronRight, Download, MoreHorizontal, Search, Smartphone, Upload, UserPlus } from 'lucide-react';
import {
  Avatar, Badge, Button, Card, Input, Segmented, Select, Table, TBody, TD, TH, THead, TR, type BadgeTone,
} from '@fitexaa/ui';
import { PreviewShell, previewHref } from '../_components/preview-shell';
import { AppShell } from '../_components/app-shell';
import { SampleTag } from '../_components/sample-tag';
import { MEMBERS, parseParams, inr, type MemberStatus } from '../_lib/sample';

export const metadata: Metadata = { title: 'Members · Design preview' };

const STATUS: Record<MemberStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  expiring: { label: 'Expiring', tone: 'warning' },
  expired: { label: 'Expired', tone: 'danger' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  none: { label: 'No plan', tone: 'neutral' },
};

function Expiry({ endDate, daysLeft, status }: { endDate: string | null; daysLeft: number | null; status: MemberStatus }) {
  if (!endDate) return <span className="text-subtle">—</span>;
  return (
    <div className="leading-tight">
      <p className="whitespace-nowrap">{endDate}</p>
      <p className="text-xs text-subtle">
        {status === 'upcoming' ? 'starts 1 Dec' : daysLeft !== null ? `${daysLeft} days left` : 'lapsed 7 days ago'}
      </p>
    </div>
  );
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = parseParams(await searchParams);
  const { gym, theme } = params;

  return (
    <PreviewShell params={params} page="members">
      <AppShell
        kind="owner"
        active="members"
        gymName={gym.name}
        userName={gym.owner}
        userRole="Owner"
        theme={theme}
        themeHref={previewHref('members', { theme: theme === 'dark' ? 'light' : 'dark', gym: gym.key })}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
                <SampleTag />
              </div>
              <p className="mt-1 text-sm text-muted">532 members · 486 with an active membership</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" leftIcon={<Upload className="size-4" />} className="max-sm:flex-1">Import CSV</Button>
              <Button leftIcon={<UserPlus className="size-4" />} className="max-sm:flex-1">Add member</Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
              <Input leftIcon={<Search />} placeholder="Name, phone or member code" wrapperClassName="lg:w-80" aria-label="Search members" />
              <div className="grid grid-cols-2 gap-3 lg:flex">
                <Select aria-label="Membership" options={[{ value: 'all', label: 'All memberships' }, { value: 'active', label: 'Active' }, { value: 'expiring', label: 'Expiring in 7 days' }, { value: 'expired', label: 'Expired' }]} wrapperClassName="lg:w-48" />
                <Select aria-label="Plan" options={[{ value: 'all', label: 'All plans' }, { value: 'm', label: 'Monthly' }, { value: 'q', label: 'Quarterly' }, { value: 'h', label: 'Half-yearly' }, { value: 'y', label: 'Yearly' }]} wrapperClassName="lg:w-40" />
              </div>
              <div className="flex items-center justify-between gap-2 lg:ml-auto">
                <Segmented value="live" options={[{ value: 'live', label: 'Current' }, { value: 'archived', label: 'Archived' }]} />
                <Button variant="ghost" size="sm" leftIcon={<Download className="size-4" />}>Export</Button>
              </div>
            </div>

            {/* Desktop / tablet: table */}
            <div className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <TH>Member</TH>
                    <TH>Phone</TH>
                    <TH>Plan</TH>
                    <TH>Status</TH>
                    <TH>Expires</TH>
                    <TH className="text-right">Balance due</TH>
                    <TH>App</TH>
                    <TH className="w-10"><span className="sr-only">Actions</span></TH>
                  </tr>
                </THead>
                <TBody>
                  {MEMBERS.map((m) => (
                    <TR key={m.code}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} size={34} />
                          <div className="min-w-0 leading-tight">
                            <p className="truncate font-medium">{m.name}</p>
                            <p className="text-xs text-subtle tabular-nums">{m.code} · joined {m.joined}</p>
                          </div>
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap text-muted tabular-nums">{m.phone}</TD>
                      <TD className="text-muted">{m.plan ?? '—'}</TD>
                      <TD><Badge tone={STATUS[m.status].tone} dot>{STATUS[m.status].label}</Badge></TD>
                      <TD><Expiry endDate={m.endDate} daysLeft={m.daysLeft} status={m.status} /></TD>
                      <TD className="text-right tabular-nums">
                        {m.balancePaise ? <span className="font-medium text-warning-text">{inr(m.balancePaise)}</span> : <span className="text-subtle">—</span>}
                      </TD>
                      <TD>
                        <span title={m.appAccess ? 'Can sign in to the member app' : 'No email: no app access'} className={m.appAccess ? 'text-success-text' : 'text-subtle'}>
                          <Smartphone className="size-4" aria-label={m.appAccess ? 'App access on' : 'No app access'} />
                        </span>
                      </TD>
                      <TD><Button variant="ghost" size="icon" aria-label={`Actions for ${m.name}`}><MoreHorizontal className="size-4" /></Button></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            {/* Phone: stacked list */}
            <ul className="divide-y divide-border md:hidden">
              {MEMBERS.map((m) => (
                <li key={m.code} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={m.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{m.name}</p>
                      <Badge tone={STATUS[m.status].tone} dot>{STATUS[m.status].label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-subtle tabular-nums">
                      {m.code} · {m.plan ?? 'No plan'}{m.endDate ? ` · ends ${m.endDate}` : ''}
                    </p>
                    {m.balancePaise > 0 && <p className="mt-1 text-xs font-medium text-warning-text">{inr(m.balancePaise)} due</p>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
              <span>Showing 1–8 of 532</span>
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="icon" aria-label="Previous page" disabled><ChevronLeft className="size-4" /></Button>
                <span className="px-2 tabular-nums">1 / 67</span>
                <Button variant="secondary" size="icon" aria-label="Next page"><ChevronRight className="size-4" /></Button>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    </PreviewShell>
  );
}
