'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Building2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, Table, TBody, TD, TH, THead, TR, type BadgeTone } from '@fitnexa/ui';
import { useAuth } from '@/lib/auth';
import { useDebounced } from '@/lib/use-debounced';
import { fullDate, num } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/page-header';

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'danger' },
  archived: { label: 'Archived', tone: 'neutral' },
};
const SUB: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Paid', tone: 'neutral' },
  trialing: { label: 'Trial', tone: 'info' },
  past_due: { label: 'Past due', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};
const LIMIT = 20;


/** Super admin: every gym on the platform (read-only in Milestone 1). */
export function PlatformGymList() {
  const { api } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebounced(q.trim());

  useEffect(() => setPage(1), [query, status]);

  const gyms = useQuery({
    queryKey: ['platform', 'tenants', query, status, page],
    queryFn: () =>
      api
        .get('/api/v1/platform/tenants', { query: { q: query || undefined, status: (status || undefined) as 'active' | undefined, page, limit: LIMIT } })
        .then((r) => r),
    placeholderData: keepPreviousData,
  });

  const rows = gyms.data?.data ?? [];
  const meta = gyms.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader title="Gyms" description="Every gym on Fitnexa. Each one runs on its own subdomain." />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <Input leftIcon={<Search />} placeholder="Name or slug" aria-label="Search gyms" value={q} onChange={(e) => setQ(e.target.value)} wrapperClassName="md:w-72" />
          <Select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]}
            wrapperClassName="md:w-44"
          />
        </div>

        {gyms.isError ? (
          <EmptyState icon={<AlertTriangle />} title="Couldn’t load gyms" description={errorMessage(gyms.error)} action={<Button onClick={() => gyms.refetch()}>Try again</Button>} />
        ) : !gyms.data ? (
          <div className="flex flex-col gap-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Building2 />} title={query || status ? 'No gyms match' : 'No gyms yet'} description={query || status ? 'Try a different name, slug or status.' : 'Gyms you create appear here.'} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Gym</TH>
                <TH className="hidden md:table-cell">City</TH>
                <TH>Status</TH>
                <TH className="hidden md:table-cell">Subscription</TH>
                <TH className="hidden sm:table-cell">Created</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((g) => (
                <TR key={g.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-xs font-semibold text-muted" aria-hidden>
                        {g.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                      </span>
                      <div className="min-w-0 leading-tight">
                        <p className="font-medium sm:whitespace-nowrap">{g.name}</p>
                        <p className="text-xs text-subtle">{g.slug}{g.city ? <span className="md:hidden"> · {g.city}</span> : null}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="hidden text-muted md:table-cell">{g.city ?? '—'}</TD>
                  <TD><Badge tone={STATUS[g.status]?.tone ?? 'neutral'} dot>{STATUS[g.status]?.label ?? g.status}</Badge></TD>
                  <TD className="hidden md:table-cell">
                    {g.subscriptionStatus ? <Badge tone={SUB[g.subscriptionStatus]?.tone ?? 'neutral'}>{SUB[g.subscriptionStatus]?.label ?? g.subscriptionStatus}</Badge> : <span className="text-subtle">—</span>}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-muted sm:table-cell">{fullDate(g.createdAt.slice(0, 10))}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {meta && rows.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
            <span>{num(meta.total ?? rows.length)} {meta.total === 1 ? 'gym' : 'gyms'}</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
                <span className="px-2 tabular-nums">{page} / {totalPages}</span>
                <Button variant="secondary" size="icon" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
