'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, ChevronRight as Go, IndianRupee, Search, Smartphone, Upload, UserPlus, Users } from 'lucide-react';
import { Avatar, Badge, Button, buttonClasses, Card, cn, EmptyState, Input, Segmented, Select, Skeleton, Table, TBody, TD, TH, THead, TR, type BadgeTone } from '@fitnexa/ui';
import type { MemberListItem, MemberListMembership } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { fullDate, inr, num, phone, shortDate } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useDebounced } from '@/lib/use-debounced';
import { PageHeader } from '@/components/page-header';

const LIMIT = 20;
const SORTS = [
  { value: '-joinDate', label: 'Newest first' },
  { value: 'joinDate', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'memberCode', label: 'Member code' },
] as const;
type Sort = (typeof SORTS)[number]['value'];

const STATUSES = [
  { value: '', label: 'All memberships' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring soon' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'expired', label: 'Expired' },
  { value: 'none', label: 'No membership' },
] as const;
type StatusFilter = (typeof STATUSES)[number]['value'];

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  expiring: { label: 'Expiring', tone: 'warning' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  expired: { label: 'Expired', tone: 'danger' },
  none: { label: 'No plan', tone: 'neutral' },
};

/** Badge key for a row: an active membership the API flags as expiring soon shows as "Expiring". */
const badgeKey = (m: MemberListMembership) => (m.status === 'active' && m.expiringSoon ? 'expiring' : m.status);

function StatusBadge({ m }: { m: MemberListMembership }) {
  const b = STATUS_BADGE[badgeKey(m)] ?? STATUS_BADGE.none!;
  return <Badge tone={b.tone} dot>{b.label}</Badge>;
}

/** End date with a short caption: days left, start date, or renewal already booked. */
function Expiry({ m }: { m: MemberListMembership }) {
  if (!m.endDate) return <span className="text-subtle">—</span>;
  const caption =
    m.status === 'upcoming' && m.startDate ? `starts ${shortDate(m.startDate)}`
    : m.nextStartDate ? 'renewal booked'
    : m.status === 'active' && m.daysLeft !== null ? `${m.daysLeft} ${m.daysLeft === 1 ? 'day' : 'days'} left`
    : m.status === 'expired' ? 'ended'
    : null;
  return (
    <div className="leading-tight">
      <p className="whitespace-nowrap">{fullDate(m.endDate)}</p>
      {caption && <p className={cn('text-xs', m.expiringSoon && !m.nextStartDate ? 'text-warning-text' : 'text-subtle')}>{caption}</p>}
    </div>
  );
}

/** List state lives in the URL so Back from a profile returns to the same search and page. */
function useListParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sortParam = params.get('sort');
  const state = {
    q: params.get('q') ?? '',
    archived: params.get('view') === 'archived',
    sort: (SORTS.some((s) => s.value === sortParam) ? sortParam : '-joinDate') as Sort,
    status: (STATUSES.some((s) => s.value === params.get('status')) ? params.get('status') : '') as StatusFilter,
    due: params.get('due') === '1',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
  function update(next: Partial<typeof state>) {
    const merged = { ...state, ...next };
    const qs = new URLSearchParams();
    if (merged.q) qs.set('q', merged.q);
    if (merged.archived) qs.set('view', 'archived');
    if (merged.sort !== '-joinDate') qs.set('sort', merged.sort);
    if (merged.status) qs.set('status', merged.status);
    if (merged.due) qs.set('due', '1');
    if (merged.page > 1) qs.set('page', String(merged.page));
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }
  return [state, update] as const;
}

function AppAccess({ on }: { on: boolean }) {
  return (
    <span title={on ? 'Can sign in to the member app' : 'No email on file: no member app'} className={on ? 'text-success-text' : 'text-subtle'}>
      <Smartphone className="size-4" aria-label={on ? 'Member app on' : 'No member app'} />
    </span>
  );
}

export function MemberList() {
  const { api, can } = useAuth();
  const [state, update] = useListParams();
  const [q, setQ] = useState(state.q);
  const query = useDebounced(q.trim());

  // Typing a search resets to page 1; the URL keeps whatever was last searched.
  useEffect(() => {
    if (query !== state.q) update({ q: query, page: 1 });
  }, [query]);

  const members = useQuery({
    queryKey: ['members', state],
    queryFn: () =>
      api.get('/api/v1/members', {
        query: {
          q: state.q || undefined,
          archived: state.archived ? 'true' : 'false',
          sort: state.sort,
          status: state.status || undefined,
          due: state.due ? 'true' : undefined,
          page: state.page,
          limit: LIMIT,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const rows: MemberListItem[] = members.data?.data ?? [];
  const meta = members.data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;
  const from = total === 0 ? 0 : (state.page - 1) * LIMIT + 1;
  const to = Math.min(total, state.page * LIMIT);
  const filtered = Boolean(state.q || state.status || state.due);

  const href = (m: MemberListItem) => `/members/${m.id}`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        title="Members"
        description={meta ? `${num(total)} ${state.archived ? 'archived' : ''} ${total === 1 ? 'member' : 'members'}${filtered ? (total === 1 ? ' matches' : ' match') : ''}`.replace(/\s+/g, ' ') : ' '}
        actions={
          <>
            {can('members:import') && (
              <Link href="/members/import" className={buttonClasses({ variant: 'secondary', className: 'max-sm:flex-1' })}>
                <Upload className="size-4" /> Import CSV
              </Link>
            )}
            {can('members:create') && (
              <Link href="/members/new" className={buttonClasses({ className: 'max-sm:flex-1' })}>
                <UserPlus className="size-4" /> Add member
              </Link>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <Input
            leftIcon={<Search />}
            placeholder="Name, phone, email or member code"
            aria-label="Search members"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            wrapperClassName="lg:w-80"
          />
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <Select
              aria-label="Membership status"
              value={state.status}
              onChange={(e) => update({ status: e.target.value as StatusFilter, page: 1 })}
              options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              wrapperClassName="sm:w-44"
            />
            <Button
              variant={state.due ? 'primary' : 'secondary'}
              aria-pressed={state.due}
              leftIcon={<IndianRupee className="size-4" />}
              onClick={() => update({ due: !state.due, page: 1 })}
            >
              Has dues
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 lg:ml-auto">
            <Select
              aria-label="Sort"
              value={state.sort}
              onChange={(e) => update({ sort: e.target.value as Sort, page: 1 })}
              options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
              wrapperClassName="w-44"
            />
            <Segmented
              value={state.archived ? 'archived' : 'current'}
              onChange={(v) => update({ archived: v === 'archived', page: 1 })}
              options={[
                { value: 'current', label: 'Current' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>
        </div>

        {members.isError ? (
          <EmptyState icon={<AlertTriangle />} title="Couldn’t load members" description={errorMessage(members.error)} action={<Button onClick={() => members.refetch()}>Try again</Button>} />
        ) : !members.data ? (
          <div className="flex flex-col gap-3 p-5" aria-busy>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<Search />}
              title="No members match"
              description={state.q ? `Nothing found for “${state.q}”. Try part of the name, the last digits of the phone, or the member code.` : 'No members with this membership status or dues.'}
              action={<Button variant="secondary" onClick={() => { setQ(''); update({ q: '', status: '', due: false, page: 1 }); }}>Clear filters</Button>}
            />
          ) : state.archived ? (
            <EmptyState icon={<Users />} title="No archived members" description="Members you archive appear here and can be restored." />
          ) : (
            <EmptyState
              icon={<Users />}
              title="No members yet"
              description="Add your first member, or import your existing list from a spreadsheet."
              action={
                <>
                  {can('members:create') && <Link href="/members/new" className={buttonClasses()}><UserPlus className="size-4" /> Add member</Link>}
                  {can('members:import') && <Link href="/members/import" className={buttonClasses({ variant: 'secondary' })}><Upload className="size-4" /> Import CSV</Link>}
                </>
              }
            />
          )
        ) : (
          <>
            {/* Tablet and up: table */}
            <div className={`hidden md:block ${members.isFetching ? 'opacity-70 transition-opacity' : ''}`}>
              <Table>
                <THead>
                  <tr>
                    <TH>Member</TH>
                    <TH className="hidden xl:table-cell">Phone</TH>
                    <TH>Plan</TH>
                    <TH>Status</TH>
                    <TH>Expires</TH>
                    <TH className="text-right">Balance due</TH>
                    <TH className="hidden lg:table-cell">App</TH>
                    <TH className="w-10"><span className="sr-only">Open</span></TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((m) => (
                    <TR key={m.id} className="relative cursor-pointer">
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} src={m.photoUrl} size={34} />
                          <div className="min-w-0 leading-tight">
                            {/* The whole row is clickable through this link's ::after overlay. */}
                            <Link href={href(m)} className="truncate font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent-ring">
                              {m.name}
                            </Link>
                            <p className="text-xs text-subtle tabular-nums">{m.memberCode}<span className="xl:hidden"> · {phone(m.phone)}</span></p>
                          </div>
                        </div>
                      </TD>
                      <TD className="hidden whitespace-nowrap text-muted tabular-nums xl:table-cell">{phone(m.phone)}</TD>
                      <TD className="text-muted">{m.membership.plan?.name ?? <span className="text-subtle">—</span>}</TD>
                      <TD>{state.archived ? <Badge tone="neutral">Archived</Badge> : <StatusBadge m={m.membership} />}</TD>
                      <TD><Expiry m={m.membership} /></TD>
                      <TD className="text-right tabular-nums">
                        {m.balanceDuePaise > 0 ? <span className="font-medium text-warning-text">{inr(m.balanceDuePaise)}</span> : <span className="text-subtle">—</span>}
                      </TD>
                      <TD className="hidden lg:table-cell">{!state.archived && <AppAccess on={m.appAccess} />}</TD>
                      <TD className="text-subtle"><Go className="size-4" aria-hidden /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            {/* Phone: stacked rows */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((m) => (
                <li key={m.id}>
                  <Link href={href(m)} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                    <Avatar name={m.name} src={m.photoUrl} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{m.name}</p>
                        {state.archived ? <Badge tone="neutral">Archived</Badge> : <StatusBadge m={m.membership} />}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-subtle tabular-nums">
                        {m.memberCode} · {m.membership.plan?.name ?? 'No plan'}{m.membership.endDate ? ` · ends ${shortDate(m.membership.endDate)}` : ''}
                      </p>
                      {m.balanceDuePaise > 0 && <p className="mt-1 text-xs font-medium text-warning-text">{inr(m.balanceDuePaise)} due</p>}
                    </div>
                    <Go className="size-4 text-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {meta && rows.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
            <span className="tabular-nums">Showing {num(from)}–{num(to)} of {num(total)}</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="icon" aria-label="Previous page" disabled={state.page <= 1} onClick={() => update({ page: state.page - 1 })}><ChevronLeft className="size-4" /></Button>
                <span className="px-2 tabular-nums">{state.page} / {totalPages}</span>
                <Button variant="secondary" size="icon" aria-label="Next page" disabled={state.page >= totalPages} onClick={() => update({ page: state.page + 1 })}><ChevronRight className="size-4" /></Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
