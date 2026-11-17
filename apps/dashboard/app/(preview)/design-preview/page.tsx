import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ArrowRight, Check, Inbox, IndianRupee, Mail, Plus, ScanLine, Search, ShieldAlert, Trash2, UserPlus, Users, Wallet } from 'lucide-react';
import {
  accentFor, ActionPill, ActionPillItem, Avatar, Badge, brandVars, Button, Card, CardBody, CardFooter, CardHeader,
  EmptyState, Input, KpiCard, ModalPanel, NavItem, Segmented, Select, Skeleton, Sparkline, Table, TBody, TD, TH, THead,
  ToastView, TR, TrendChip, type Theme,
} from '@fitnexa/ui';
import { PreviewShell } from './_components/preview-shell';
import { SampleTag } from './_components/sample-tag';
import { ModalDemo, RecordPaymentForm, ToastDemo } from './_components/demos';
import { MEMBERS, SAMPLE_GYMS, SPARKS, inr, parseParams } from './_lib/sample';

export const metadata: Metadata = { title: 'Design preview' };

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-xs font-medium tracking-wide text-subtle uppercase">{children}</p>;
}

const SURFACES = [
  ['bg', 'Page'], ['surface', 'Card'], ['surface-2', 'Raised / hover'], ['surface-3', 'Track / pressed'],
  ['border', 'Border'], ['border-strong', 'Border strong'],
] as const;
const TEXTS = [['text', 'Text'], ['text-muted', 'Muted'], ['text-subtle', 'Subtle']] as const;
const SEMANTIC = ['success', 'warning', 'danger', 'info'] as const;

function Ratio({ value, min }: { value: number; min: number }) {
  const ok = value >= min;
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${ok ? 'text-success-text' : 'text-danger-text'}`}>
      {ok && <Check className="size-3" />}{value.toFixed(2)}:1
    </span>
  );
}

function ContrastRow({ color, name, theme }: { color: string; name: string; theme: Theme }) {
  const a = accentFor(color, theme);
  return (
    <TR>
      <TD>
        <div className="flex items-center gap-2">
          <span className="size-5 rounded-md ring-1 ring-border" style={{ background: color }} />
          <span className="font-medium">{name}</span>
        </div>
        <p className="mt-0.5 text-xs text-subtle tabular-nums">{color}</p>
      </TD>
      <TD className="capitalize text-muted">{theme}</TD>
      <TD>
        <div className="flex items-center gap-2">
          <span className="flex h-7 items-center rounded-md px-2.5 text-xs font-semibold" style={{ background: a.accent, color: a.onAccent }}>Aa</span>
          <span className="text-xs tabular-nums">{a.accent}</span>
          {a.adjusted ? <Badge tone="info">adjusted</Badge> : <Badge>as-is</Badge>}
        </div>
      </TD>
      <TD><Ratio value={a.ratios.fillVsBg} min={3} /></TD>
      <TD><Ratio value={a.ratios.onAccent} min={4.5} /> <span className="text-xs text-subtle">{a.onAccent === '#FFFFFF' ? 'white' : 'dark'} text</span></TD>
      <TD><Ratio value={a.ratios.textVsBg} min={4.5} /> <span className="text-xs tabular-nums text-subtle">{a.accentText}</span></TD>
    </TR>
  );
}

/** One small composite rendered in a given theme + gym colour (nested [data-theme]). */
function Swatch({ theme, gymKey }: { theme: Theme; gymKey: 'rose' | 'sky' }) {
  const g = SAMPLE_GYMS[gymKey];
  return (
    <div data-theme={theme} style={brandVars(g.primaryColor) as React.CSSProperties} className="rounded-xl border border-border bg-bg p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{g.name}</span>
        <span className="text-xs text-subtle capitalize">{theme} · {g.primaryColor}</span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" leftIcon={<Plus className="size-4" />}>Add member</Button>
          <Button size="sm" variant="secondary">Cancel</Button>
          <Badge tone="accent" dot>Live</Badge>
        </div>
        <NavItem icon={<Users />} label="Members" active />
        <KpiCard label="Active members" value="486" trend={3.2} spark={SPARKS.active} />
        <p className="text-sm">Link colour: <a href="#" className="font-medium text-accent-text underline-offset-2 hover:underline">View renewals</a></p>
      </div>
    </div>
  );
}

export default async function DesignPreview({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = parseParams(await searchParams);
  const nav = [
    ['matrix', 'Themes × colours'], ['colour', 'Colour'], ['accent', 'Accent contrast'], ['type', 'Typography'],
    ['space', 'Spacing, radius, shadow'], ['buttons', 'Buttons'], ['inputs', 'Inputs'], ['badges', 'Badges'],
    ['cards', 'Cards & KPI'], ['table', 'Table'], ['overlays', 'Modal & toast'], ['states', 'Loading & empty'], ['patterns', 'Patterns'],
  ];

  return (
    <PreviewShell params={params} page="">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent" size="md">Milestone 0</Badge>
            <SampleTag />
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Design system</h1>
          <p className="mt-2 max-w-2xl text-md text-muted">
            Calm near-black base with a single accent: the gym&apos;s own colour, checked for contrast in each theme.
            Geist type, compact dashboard density, no heavy gradients. Use the bar above to switch theme and gym colour.
          </p>
          <nav className="mt-6 flex flex-wrap gap-1.5">
            {nav.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted hover:border-border-strong hover:text-fg">{label}</a>
            ))}
          </nav>
        </header>

        <div className="flex flex-col gap-14">
          <Section id="matrix" title="Themes × gym colours" description="The same components in both themes with both sample gym colours, rendered side by side.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Swatch theme="dark" gymKey="rose" />
              <Swatch theme="dark" gymKey="sky" />
              <Swatch theme="light" gymKey="rose" />
              <Swatch theme="light" gymKey="sky" />
            </div>
          </Section>

          <Section id="colour" title="Colour" description="Neutral greys carry the interface; the accent is reserved for the primary action, active state and highlights. One semantic set for status.">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label>Surfaces & borders</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SURFACES.map(([v, l]) => (
                    <div key={v} className="overflow-hidden rounded-lg border border-border">
                      <div className="h-12" style={{ background: `var(--${v})` }} />
                      <div className="bg-surface px-2.5 py-1.5"><p className="text-xs font-medium">{l}</p><p className="text-2xs text-subtle">--{v}</p></div>
                    </div>
                  ))}
                </div>
                <Label><span className="mt-4 block">Text</span></Label>
                <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
                  {TEXTS.map(([v, l]) => <p key={v} style={{ color: `var(--${v})` }} className="text-base">{l} · --{v}</p>)}
                </div>
              </div>
              <div>
                <Label>Accent (gym colour)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[['accent', 'Fill'], ['accent-soft', 'Soft'], ['accent-text', 'Text']].map(([v, l]) => (
                    <div key={v} className="overflow-hidden rounded-lg border border-border">
                      <div className="h-12" style={{ background: `var(--${v})` }} />
                      <div className="bg-surface px-2.5 py-1.5"><p className="text-xs font-medium">{l}</p><p className="text-2xs text-subtle">--{v}</p></div>
                    </div>
                  ))}
                </div>
                <Label><span className="mt-4 block">Semantic</span></Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SEMANTIC.map((s) => (
                    <div key={s} className="rounded-lg border border-border p-2.5" style={{ background: `var(--${s}-soft)` }}>
                      <span className="block h-6 rounded-md" style={{ background: `var(--${s})` }} />
                      <p className="mt-2 text-sm font-medium capitalize" style={{ color: `var(--${s}-text)` }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section id="accent" title="Accent contrast check" description="Any gym colour works. Lightness is moved only as far as needed: fill ≥ 3:1 against the page, text on the fill ≥ 4.5:1 (white or dark, whichever reads better), accent-coloured text ≥ 4.5:1. Sky blue is too pale on white, so the light theme darkens it.">
            <Card className="overflow-hidden">
              <Table>
                <THead>
                  <tr>
                    <TH>Gym colour</TH><TH>Theme</TH><TH>Accent used</TH><TH>Fill vs page (≥3)</TH><TH>Text on fill (≥4.5)</TH><TH>Accent text (≥4.5)</TH>
                  </tr>
                </THead>
                <TBody>
                  {Object.values(SAMPLE_GYMS).flatMap((g) =>
                    (['dark', 'light'] as const).map((t) => <ContrastRow key={g.key + t} color={g.primaryColor} name={g.shortName} theme={t} />),
                  )}
                  <ContrastRow color="#FACC15" name="Edge case: yellow" theme="light" />
                  <ContrastRow color="#111827" name="Edge case: near-black" theme="dark" />
                </TBody>
              </Table>
            </Card>
          </Section>

          <Section id="type" title="Typography" description="Geist Sans; tabular figures for every number. 14px body, compact for data-dense screens.">
            <Card className="divide-y divide-border">
              {[
                ['text-3xl font-semibold tracking-tight', '34 / Display', '₹3,42,500'],
                ['text-2xl font-semibold tracking-tight', '28 / Page title', 'Good evening, Rahul'],
                ['text-xl font-semibold tracking-tight', '22 / Section', 'Monthly revenue'],
                ['text-md font-semibold', '16 / Card title', 'Recent activity'],
                ['text-base', '14 / Body', 'Membership ends the day before the same date next month.'],
                ['text-sm text-muted', '13 / Secondary', 'Net of refunds, last 12 months'],
                ['text-xs text-subtle', '12 / Caption', 'RCPT/2026-27/0418 · 6 min ago'],
                ['text-2xs font-semibold uppercase tracking-wider text-subtle', '11 / Overline', 'Finance'],
              ].map(([cls, meta, sample]) => (
                <div key={meta} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="w-32 shrink-0 text-xs text-subtle">{meta}</span>
                  <span className={`${cls} tabular-nums`}>{sample}</span>
                </div>
              ))}
            </Card>
          </Section>

          <Section id="space" title="Spacing, radius, shadow" description="4px spacing grid (Tailwind scale). Cards 16px radius, controls 8px. Dark theme uses borders and a faint top highlight; light uses soft shadows.">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5">
                <Label>Spacing</Label>
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                    <div key={n} className="flex items-center gap-3 text-xs text-subtle tabular-nums">
                      <span className="w-14">{n * 4}px</span>
                      <span className="h-2.5 rounded-xs bg-accent" style={{ width: n * 4 * 2 }} />
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <Label>Radius</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[['xs', 4], ['sm', 6], ['md', 8], ['lg', 12], ['xl', 16], ['full', 999]].map(([n, r]) => (
                    <div key={n} className="text-center">
                      <div className="mx-auto size-12 border border-border-strong bg-surface-2" style={{ borderRadius: Number(r) }} />
                      <p className="mt-1 text-2xs text-subtle">{n}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <Label>Elevation</Label>
                <div className="grid grid-cols-3 gap-3">
                  {['shadow-1', 'shadow-2', 'shadow-3'].map((s) => (
                    <div key={s} className="text-center">
                      <div className={`mx-auto size-12 rounded-lg border border-border bg-surface ${s}`} />
                      <p className="mt-1 text-2xs text-subtle">{s.replace('shadow-', 'level ')}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Section>

          <Section id="buttons" title="Buttons">
            <Card className="flex flex-col gap-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button leftIcon={<UserPlus className="size-4" />}>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger" leftIcon={<Trash2 className="size-4" />}>Danger</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>Large</Button>
                <Button size="icon" variant="secondary" aria-label="Search"><Search className="size-4" /></Button>
                <Button loading>Saving</Button>
                <Button disabled>Disabled</Button>
              </div>
            </Card>
          </Section>

          <Section id="inputs" title="Inputs & select" description="Labels above fields, hint or error below. Select is the native control (keyboard and mobile-friendly).">
            <Card className="grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-3">
              <Input label="Full name" placeholder="e.g. Aarav Sharma" required />
              <Input label="Phone" defaultValue="98765 43210" hint="10-digit Indian mobile" inputMode="tel" />
              <Input label="Email" leftIcon={<Mail />} defaultValue="aarav@example" error="Enter a valid email address" />
              <Select label="Plan" placeholder="Choose a plan" options={[{ value: 'm', label: 'Monthly · ₹1,500' }, { value: 'q', label: 'Quarterly · ₹4,000' }, { value: 'y', label: 'Yearly · ₹14,000' }]} />
              <Input label="Search" leftIcon={<Search />} placeholder="Name, phone or code" />
              <Input label="Disabled" defaultValue="M0412" disabled />
            </Card>
          </Section>

          <Section id="badges" title="Badges & trend chips">
            <Card className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="success" dot>Active</Badge>
                <Badge tone="warning" dot>Expiring</Badge>
                <Badge tone="danger" dot>Expired</Badge>
                <Badge tone="info" dot>Upcoming</Badge>
                <Badge dot>No plan</Badge>
                <Badge tone="accent">Gym accent</Badge>
                <Badge tone="success" size="md">Paid</Badge>
                <Badge tone="warning" size="md">Partial</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <TrendChip value={12.3} />
                <TrendChip value={-4.7} />
                <TrendChip value={-11.1} invert />
                <TrendChip value={0} />
              </div>
            </Card>
          </Section>

          <Section id="cards" title="Cards & KPI cards" description="KPI: label, value with trend, comparison caption, sparkline. Sparklines use the accent; warnings use the semantic colour.">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard label="Revenue (Nov)" value={inr(34250000)} trend={12.3} caption="vs ₹3,05,000 in Oct" icon={<IndianRupee />} spark={SPARKS.revenue} />
              <KpiCard label="Active members" value="486" trend={3.2} caption="of 532 total" icon={<Users />} spark={SPARKS.active} />
              <KpiCard label="Today's check-ins" value="142" trend={-4.7} caption="29% of active" icon={<ScanLine />} spark={SPARKS.attendance} />
              <KpiCard label="Pending renewals" value="24" trend={-11.1} trendInvert caption="ending in 7 days" spark={SPARKS.renewals} sparkColor="var(--warning)" />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader title="Card title" description="Optional description line" action={<Button variant="ghost" size="sm">Action</Button>} />
                <CardBody><p className="text-sm text-muted">Cards hold one topic each. Header, body and an optional footer.</p></CardBody>
                <CardFooter><Button size="sm">Save</Button><Button size="sm" variant="ghost">Cancel</Button></CardFooter>
              </Card>
              <Card className="p-5">
                <Label>Sparkline</Label>
                <Sparkline data={SPARKS.revenue} className="h-16" />
                <Sparkline data={SPARKS.renewals} color="var(--warning)" className="mt-3 h-10" fill={false} />
              </Card>
            </div>
          </Section>

          <Section id="table" title="Table" description="On phones tables scroll sideways; list screens switch to stacked rows (see the Members mock-up).">
            <Card className="overflow-hidden">
              <Table>
                <THead><tr><TH>Member</TH><TH>Plan</TH><TH>Status</TH><TH className="text-right">Balance</TH></tr></THead>
                <TBody>
                  {MEMBERS.slice(0, 4).map((m) => (
                    <TR key={m.code}>
                      <TD><div className="flex items-center gap-3"><Avatar name={m.name} /><div className="leading-tight"><p className="font-medium">{m.name}</p><p className="text-xs text-subtle">{m.code}</p></div></div></TD>
                      <TD className="text-muted">{m.plan}</TD>
                      <TD><Badge tone={m.status === 'active' ? 'success' : m.status === 'expiring' ? 'warning' : 'danger'} dot className="capitalize">{m.status}</Badge></TD>
                      <TD className="text-right tabular-nums">{m.balancePaise ? inr(m.balancePaise) : '—'}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          </Section>

          <Section id="overlays" title="Modal & toast" description="Modal is the native dialog (focus trap, Esc, inert page); it becomes a bottom sheet on phones. Shown here statically, and live with the buttons.">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-dashed border-border-strong bg-overlay/30 p-4 sm:p-8">
                <ModalPanel
                  title="Record payment"
                  description="Kabir Singh · Yearly membership"
                  footer={<><Button variant="secondary">Cancel</Button><Button leftIcon={<Wallet className="size-4" />}>Record ₹2,500</Button></>}
                >
                  <RecordPaymentForm />
                </ModalPanel>
              </div>
              <div className="flex flex-col gap-3">
                <ToastView toast={{ tone: 'success', title: 'Payment recorded', description: '₹2,500 UPI · RCPT/2026-27/0419' }} onDismiss={undefined} />
                <ToastView toast={{ tone: 'error', title: 'Check-in refused', description: 'Membership expired on 10 Nov 2026' }} />
                <ToastView toast={{ tone: 'warning', title: 'Email not configured', description: 'Sign-in links will send once email is set up.' }} />
                <ToastView toast={{ tone: 'info', title: 'Import validated', description: '214 rows ready, 0 errors' }} />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <ModalDemo />
                  <ToastDemo />
                </div>
              </div>
            </div>
          </Section>

          <Section id="states" title="Loading & empty states">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <Label>Skeleton (KPI + list)</Label>
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-8 w-full" />
                  <div className="mt-2 flex flex-col gap-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-full" />
                        <div className="flex flex-1 flex-col gap-1.5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card>
                <EmptyState
                  icon={<Inbox />}
                  title="No members yet"
                  description="Add your first member, or import your existing list from a spreadsheet."
                  action={<><Button leftIcon={<UserPlus className="size-4" />}>Add member</Button><Button variant="secondary">Import CSV</Button></>}
                />
              </Card>
            </div>
          </Section>

          <Section id="patterns" title="Patterns" description="Quick-action pill and nav glow (Synaptix accents), segmented control, and the banner shown while a platform admin is signed in as the gym owner.">
            <div className="flex flex-col gap-4">
              <Card className="flex flex-wrap items-center gap-6 p-5">
                <ActionPill>
                  <ActionPillItem icon={<UserPlus />} primary>Add member</ActionPillItem>
                  <ActionPillItem icon={<Wallet />}>Record payment</ActionPillItem>
                  <ActionPillItem icon={<ScanLine />}>Check-in</ActionPillItem>
                </ActionPill>
                <Segmented value="30d" options={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '12m', label: '12M' }]} />
                <div className="w-56 rounded-lg border border-border bg-surface p-2">
                  <NavItem icon={<Users />} label="Members" active />
                  <NavItem icon={<Wallet />} label="Payments" />
                </div>
              </Card>
              <div role="status" className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center">
                <ShieldAlert className="size-5 shrink-0 text-warning-text" />
                <p className="flex-1 text-sm">
                  <span className="font-semibold">Support session.</span> A platform admin is signed in as the owner of this gym. Every action is recorded in the audit log.
                </p>
                <Button size="sm" variant="secondary">End session</Button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </PreviewShell>
  );
}
