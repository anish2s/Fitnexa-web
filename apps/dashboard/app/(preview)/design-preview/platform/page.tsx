import type { Metadata } from 'next';
import { Building2, CircleAlert, Clock, LogIn, MoreHorizontal, Plus, Search, Users } from 'lucide-react';
import {
  Badge, Button, Card, Input, KpiCard, Select, Table, TBody, TD, TH, THead, TR, type BadgeTone,
} from '@fitnexa/ui';
import { PreviewShell, previewHref } from '../_components/preview-shell';
import { AppShell } from '../_components/app-shell';
import { SampleTag } from '../_components/sample-tag';
import { PLATFORM_GYMS, parseParams } from '../_lib/sample';

export const metadata: Metadata = { title: 'Fitnexa · Gyms · Design preview' };

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'danger' },
};
const SUB: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Paid', tone: 'neutral' },
  trialing: { label: 'Trial', tone: 'info' },
  past_due: { label: 'Past due', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

/** Gym monogram in the gym's own colour: here it's the gym's identity, not the console accent. */
function GymChip({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('');
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ring-1 ring-black/10" style={{ background: color }} aria-hidden>
      {initials}
    </span>
  );
}

export default async function PlatformGyms({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = parseParams(await searchParams);
  const { theme } = params;

  return (
    <PreviewShell params={params} page="platform">
      <AppShell
        kind="platform"
        active="gyms"
        userName="Admin"
        userRole="Super admin"
        theme={theme}
        themeHref={previewHref('platform', { theme: theme === 'dark' ? 'light' : 'dark', gym: params.gym.key })}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Gyms</h1>
                <SampleTag />
              </div>
              <p className="mt-1 text-sm text-muted">Every gym on Fitnexa. Each runs on its own subdomain.</p>
            </div>
            <Button leftIcon={<Plus className="size-4" />}>Create gym</Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Gyms" value="6" caption="2 added this month" icon={<Building2 />} />
            <KpiCard label="Members, all gyms" value="1,276" trend={4.1} icon={<Users />} />
            <KpiCard label="On trial" value="1" caption="ends in 9 days" icon={<Clock />} />
            <KpiCard label="Suspended" value="1" caption="FitZone Studio" icon={<CircleAlert />} />
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
              <Input leftIcon={<Search />} placeholder="Name or slug" aria-label="Search gyms" wrapperClassName="md:w-72" />
              <Select aria-label="Status" options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} wrapperClassName="md:w-44" />
            </div>
            <Table>
              <THead>
                <tr>
                  <TH>Gym</TH>
                  <TH className="hidden md:table-cell">City</TH>
                  <TH>Status</TH>
                  <TH className="hidden md:table-cell">Subscription</TH>
                  <TH className="hidden text-right sm:table-cell">Members</TH>
                  <TH className="hidden md:table-cell">Created</TH>
                  <TH className="text-right"><span className="sr-only">Actions</span></TH>
                </tr>
              </THead>
              <TBody>
                {PLATFORM_GYMS.map((g) => (
                  <TR key={g.slug}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <GymChip name={g.name} color={g.color} />
                        <div className="min-w-0 leading-tight">
                          <p className="font-medium sm:whitespace-nowrap">{g.name}</p>
                          <p className="text-xs text-subtle">{g.slug}.yourapp.in<span className="md:hidden"> · {g.city}</span></p>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden text-muted md:table-cell">{g.city}</TD>
                    <TD><Badge tone={STATUS[g.status]!.tone} dot>{STATUS[g.status]!.label}</Badge></TD>
                    <TD className="hidden md:table-cell"><Badge tone={SUB[g.sub]!.tone}>{SUB[g.sub]!.label}</Badge></TD>
                    <TD className="hidden text-right tabular-nums sm:table-cell">{g.members.toLocaleString('en-IN')}</TD>
                    <TD className="hidden whitespace-nowrap text-muted md:table-cell">{g.created}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" leftIcon={<LogIn className="size-4" />} disabled={g.status !== 'active'} className="max-sm:hidden" aria-label={`Log in as owner of ${g.name}`}><span className="hidden lg:inline">Log in as owner</span></Button>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${g.name}`}><MoreHorizontal className="size-4" /></Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="border-t border-border px-5 py-3 text-sm text-muted">6 gyms</div>
          </Card>
        </div>
      </AppShell>
    </PreviewShell>
  );
}
