'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Archive, ArchiveRestore, Pencil, Plus, Tag } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Segmented, Skeleton, useToast } from '@fitexaa/ui';
import type { Plan } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { useGym } from '@/lib/queries';
import { inr, MONTHS_LABEL, TAX_LABEL } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PlanForm } from './plan-form';

function PlanCard({ plan, manage, onEdit, onArchive }: { plan: Plan; manage: boolean; onEdit: () => void; onArchive: () => void }) {
  const archived = Boolean(plan.archivedAt);
  const b = plan.breakdown;
  const perMonth = Math.round(b.totalPaise / plan.months);
  return (
    <Card className="flex flex-col">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-md font-semibold">{plan.name}</h3>
            <p className="text-sm text-muted">{MONTHS_LABEL(plan.months)}</p>
          </div>
          {archived ? <Badge tone="neutral">Archived</Badge> : <Badge tone={plan.taxMode === 'none' ? 'neutral' : 'accent'}>{TAX_LABEL[plan.taxMode]}</Badge>}
        </div>

        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{inr(b.totalPaise)}</p>
          <p className="mt-0.5 text-sm text-muted">
            {plan.months > 1 ? `${inr(perMonth)} a month · ` : ''}what the member pays
          </p>
        </div>

        {plan.taxMode !== 'none' && (
          <dl className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface-2 p-3 text-sm">
            <dt className="text-muted">Price before GST</dt>
            <dd className="text-right tabular-nums">{inr(b.basePaise, true)}</dd>
            <dt className="text-muted">GST {plan.gstRate}%</dt>
            <dd className="text-right tabular-nums">{inr(b.gstPaise, true)}</dd>
          </dl>
        )}

        {plan.description && <p className="text-sm text-muted">{plan.description}</p>}
      </div>
      {manage && (
        <div className="flex gap-2 border-t border-border px-5 py-3">
          {!archived && <Button variant="secondary" size="sm" leftIcon={<Pencil className="size-3.5" />} onClick={onEdit}>Edit</Button>}
          <Button variant="ghost" size="sm" leftIcon={archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />} onClick={onArchive} className="ml-auto">
            {archived ? 'Restore' : 'Archive'}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function PlanList() {
  const { api, can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const gym = useGym();
  const manage = can('plans:manage');
  const hasGstin = Boolean(gym.data?.settings?.gstin);
  const [view, setView] = useState<'current' | 'archived'>('current');
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const [archiving, setArchiving] = useState<Plan | null>(null);

  const plans = useQuery({
    queryKey: ['plans', view],
    queryFn: () => api.get('/api/v1/plans', { query: { archived: view === 'archived' ? 'true' : 'false', limit: 100 } }).then((r) => r.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['plans'] });

  async function save(body: Record<string, unknown>) {
    if (editing === 'new') {
      const { data } = await api.post('/api/v1/plans', { body: body as never });
      toast.show({ tone: 'success', title: `${data.name} created` });
    } else if (editing) {
      const { data } = await api.patch('/api/v1/plans/{id}', { params: { id: editing.id }, body: body as never });
      toast.show({ tone: 'success', title: `${data.name} updated`, description: 'New sales use the new details.' });
    }
    await refresh();
  }

  async function toggleArchive(plan: Plan) {
    const archive = !plan.archivedAt;
    await api.post(archive ? '/api/v1/plans/{id}/archive' : '/api/v1/plans/{id}/restore', { params: { id: plan.id } });
    toast.show({ tone: 'success', title: archive ? `${plan.name} archived` : `${plan.name} restored` });
    await refresh();
  }

  const rows = plans.data ?? [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        title="Plans"
        description="The memberships you sell. Prices are what the member pays."
        actions={manage && <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing('new')} className="max-sm:flex-1">New plan</Button>}
      />

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'current', label: 'Current' },
          { value: 'archived', label: 'Archived' },
        ]}
        className="w-fit"
      />

      {plans.isError ? (
        <Card><EmptyState icon={<AlertTriangle />} title="Couldn’t load plans" description={errorMessage(plans.error)} action={<Button onClick={() => plans.refetch()}>Try again</Button>} /></Card>
      ) : !plans.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card>
          {view === 'archived' ? (
            <EmptyState icon={<Archive />} title="No archived plans" description="Plans you stop selling appear here and can be restored." />
          ) : (
            <EmptyState
              icon={<Tag />}
              title="No plans yet"
              description={manage ? 'Create your first plan, e.g. Monthly, Quarterly or Yearly, so the front desk can sell memberships.' : 'The gym owner hasn’t created any plans yet.'}
              action={manage && <Button leftIcon={<Plus className="size-4" />} onClick={() => setEditing('new')}>New plan</Button>}
            />
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <PlanCard key={p.id} plan={p} manage={manage} onEdit={() => setEditing(p)} onArchive={() => setArchiving(p)} />
          ))}
        </div>
      )}

      {manage && editing !== null && (
        <PlanForm key={editing === 'new' ? 'new' : editing.id} open plan={editing === 'new' ? null : editing} hasGstin={hasGstin} onClose={() => setEditing(null)} onSave={save} />
      )}

      <ConfirmDialog
        open={archiving !== null}
        onClose={() => setArchiving(null)}
        title={archiving?.archivedAt ? `Restore ${archiving.name}?` : `Archive ${archiving?.name ?? 'plan'}?`}
        confirmLabel={archiving?.archivedAt ? 'Restore plan' : 'Archive plan'}
        tone={archiving?.archivedAt ? 'primary' : 'danger'}
        onConfirm={() => toggleArchive(archiving!)}
      >
        <p>
          {archiving?.archivedAt
            ? 'It can be sold again.'
            : 'It can no longer be sold. Members who already bought it keep their membership as sold.'}
        </p>
      </ConfirmDialog>
    </div>
  );
}
