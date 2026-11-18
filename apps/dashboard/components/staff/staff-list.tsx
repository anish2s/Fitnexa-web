'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Mail, MailPlus, Pencil, Phone, Power, UserCog, UserPlus } from 'lucide-react';
import { Avatar, Badge, Button, Card, Checkbox, EmptyState, Input, Modal, Select, Skeleton, Table, TBody, TD, TH, THead, TR, useToast, type BadgeTone } from '@fitnexa/ui';
import type { StaffView } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { actionMessage, applyFieldErrors, errorMessage, errorRef } from '@/lib/errors';
import { phone, phoneForInput, timeAgo } from '@/lib/format';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormAlert } from '@/components/form-alert';
import { PageHeader } from '@/components/page-header';

/** Extra permissions an owner can give a staff member (the API accepts only these). */
export const GRANTS: { value: string; label: string; description: string }[] = [
  { value: 'reports:read', label: 'See revenue and reports', description: 'Revenue on the Overview, and the Reports page.' },
  { value: 'payments:refund', label: 'Refund payments', description: 'Give money back on a payment, including online ones.' },
  { value: 'members:archive', label: 'Archive members', description: 'Archive and restore members.' },
  { value: 'members:import', label: 'Import members', description: 'Bring in members from a CSV file.' },
  { value: 'plans:manage', label: 'Manage plans', description: 'Create, edit and archive plans and prices.' },
  { value: 'renewals:manage', label: 'Manage reminder emails', description: 'See the reminder log, retry or cancel reminders.' },
];
const GRANT_LABEL = Object.fromEntries(GRANTS.map((g) => [g.value, g.label]));

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'info' },
  disabled: { label: 'Deactivated', tone: 'neutral' },
};

const schema = z.object({
  name: z.string().trim().min(1, 'Enter their name').max(120),
  email: z.string().trim().email('Enter a valid email address').max(254),
  phone: z.string().trim().max(20),
});
type Values = z.infer<typeof schema>;

function StaffDialog({ staff, open, onClose }: { staff: StaffView | null; open: boolean; onClose: () => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [grants, setGrants] = useState<string[]>(staff?.grants ?? []);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: staff?.name ?? '', email: staff?.email ?? '', phone: phoneForInput(staff?.phone) },
  });
  const errors = formState.errors;

  const submit = handleSubmit(async (v) => {
    setFailure(null);
    try {
      if (!staff) {
        const { data } = await api.post('/api/v1/staff', { body: { name: v.name, email: v.email, phone: v.phone || undefined, permissions: grants } as never });
        toast.show(
          data.inviteSent
            ? { tone: 'success', title: `Invite sent to ${data.staff.email}`, description: 'They set a password from the email, then sign in here.' }
            : { tone: 'warning', title: `${data.staff.name} added, but the invite email wasn’t sent`, description: 'Use “Resend invite” once email is set up.' },
        );
      } else {
        const body: Record<string, unknown> = {};
        if (v.name !== staff.name) body.name = v.name;
        if (v.email !== staff.email) body.email = v.email;
        if (v.phone !== phoneForInput(staff.phone)) body.phone = v.phone || null;
        if ([...grants].sort().join() !== [...staff.grants].sort().join()) body.permissions = grants;
        if (Object.keys(body).length === 0) return onClose();
        await api.patch('/api/v1/staff/{id}', { params: { id: staff.id }, body: body as never });
        toast.show({ tone: 'success', title: 'Changes saved', description: body.permissions ? 'Permissions apply straight away; their menu updates when they reload the page.' : undefined });
      }
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      onClose();
    } catch (err) {
      if (!applyFieldErrors(err, setError, ['name', 'email', 'phone'])) setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={staff ? `Edit ${staff.name}` : 'Invite staff'}
      description={staff ? undefined : 'They get an email to set their password. Front-desk staff can add members, sell memberships, take payments and check members in.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={formState.isSubmitting}>Cancel</Button>
          <Button type="submit" form="staff-form" loading={formState.isSubmitting}>{staff ? 'Save changes' : 'Send invite'}</Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" required error={errors.name?.message} wrapperClassName="sm:col-span-2" autoFocus {...register('name')} />
          <Input label="Email" required type="email" leftIcon={<Mail />} hint={staff ? undefined : 'The invite goes here.'} error={errors.email?.message} {...register('email')} />
          <Input label="Phone" type="tel" leftIcon={<Phone />} hint="Optional. They can sign in with it too." error={errors.phone?.message} {...register('phone')} />
        </div>
        <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">Extra permissions</legend>
          <p className="-mt-1 text-xs text-muted">On top of front-desk access. Staff can never manage staff, settings or the audit log.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {GRANTS.map((g) => (
              <Checkbox
                key={g.value}
                label={g.label}
                description={g.description}
                checked={grants.includes(g.value)}
                onChange={(e) => setGrants((xs) => (e.target.checked ? [...xs, g.value] : xs.filter((x) => x !== g.value)))}
              />
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export function StaffList() {
  const { api, can, state } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const manage = can('staff:manage');
  const meId = state.status === 'signedIn' ? state.me.user.id : '';
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<StaffView | 'new' | null>(null);
  const [toggling, setToggling] = useState<StaffView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const staff = useQuery({
    queryKey: ['staff', status],
    queryFn: () => api.get('/api/v1/staff', { query: { status: (status || undefined) as 'active' | undefined, limit: 100 } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const rows = staff.data ?? [];

  async function resend(s: StaffView) {
    setBusy(s.id);
    try {
      const { data } = await api.post('/api/v1/staff/{id}/invite', { params: { id: s.id } });
      toast.show(data.sent ? { tone: 'success', title: `Invite sent again to ${s.email}` } : { tone: 'warning', title: 'The invite email wasn’t sent', description: data.reason ?? undefined });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t send the invite', description: actionMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        title="Staff"
        description="Who can sign in to your gym, and what they can do."
        actions={manage && <Button leftIcon={<UserPlus className="size-4" />} onClick={() => setEditing('new')} className="max-sm:flex-1">Invite staff</Button>}
      />
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: 'Everyone' }, { value: 'active', label: 'Active' }, { value: 'invited', label: 'Invited' }, { value: 'disabled', label: 'Deactivated' }]} wrapperClassName="w-44" />
        </div>
        {staff.isError ? (
          <EmptyState icon={<AlertTriangle />} title="Couldn’t load staff" description={errorMessage(staff.error)} action={<Button onClick={() => staff.refetch()}>Try again</Button>} />
        ) : !staff.data ? (
          <div className="flex flex-col gap-3 p-5" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<UserCog />} title="No one here" description={status ? 'No staff with this status.' : 'Invite your front-desk team.'} />
        ) : (
          <>
          {/* Phones: stacked rows with the actions underneath. */}
          <ul className="divide-y divide-border md:hidden">
            {rows.map((s) => {
              const isOwner = s.role === 'owner';
              return (
                <li key={s.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.name}{s.id === meId && <span className="ml-1 text-xs font-normal text-subtle">(you)</span>}</p>
                      <p className="truncate text-xs text-subtle">{s.email ?? '—'}</p>
                    </div>
                    <Badge tone={STATUS[s.status]?.tone ?? 'neutral'} dot>{STATUS[s.status]?.label ?? s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {isOwner ? 'Owner · changed by support only' : `Front desk${s.grants.length ? ` + ${s.grants.map((g) => GRANT_LABEL[g] ?? g).join(', ')}` : ''}`}
                  </p>
                  {manage && !isOwner && (
                    <div className="flex flex-wrap gap-2">
                      {s.status === 'invited' && <Button size="sm" variant="secondary" leftIcon={<MailPlus className="size-3.5" />} loading={busy === s.id} onClick={() => resend(s)}>Resend invite</Button>}
                      <Button size="sm" variant="secondary" leftIcon={<Pencil className="size-3.5" />} onClick={() => setEditing(s)}>Edit</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Power className="size-3.5" />} onClick={() => setToggling(s)}>{s.status === 'disabled' ? 'Reactivate' : 'Deactivate'}</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="hidden md:block">
          <Table>
            <THead>
              <tr>
                <TH>Person</TH>
                <TH className="hidden md:table-cell">Phone</TH>
                <TH>Access</TH>
                <TH className="hidden lg:table-cell">Last sign-in</TH>
                <TH className="text-right"><span className="sr-only">Actions</span></TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((s) => {
                const isOwner = s.role === 'owner';
                return (
                  <TR key={s.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} size={34} />
                        <div className="min-w-0 leading-tight">
                          <p className="flex items-center gap-2 font-medium">{s.name}{s.id === meId && <span className="text-xs font-normal text-subtle">(you)</span>}</p>
                          <p className="truncate text-xs text-subtle">{s.email ?? '—'}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden whitespace-nowrap text-muted tabular-nums md:table-cell">{phone(s.phone)}</TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={isOwner ? 'accent' : 'neutral'}>{isOwner ? 'Owner' : 'Front desk'}</Badge>
                        <Badge tone={STATUS[s.status]?.tone ?? 'neutral'} dot>{STATUS[s.status]?.label ?? s.status}</Badge>
                      </div>
                      {!isOwner && s.grants.length > 0 && <p className="mt-1 max-w-72 text-xs text-muted">+ {s.grants.map((g) => GRANT_LABEL[g] ?? g).join(', ')}</p>}
                    </TD>
                    <TD className="hidden text-muted lg:table-cell">{s.lastLoginAt ? timeAgo(s.lastLoginAt) : s.status === 'invited' ? 'Hasn’t accepted yet' : 'Never'}</TD>
                    <TD>
                      {manage && !isOwner ? (
                        <div className="flex justify-end gap-1">
                          {s.status === 'invited' && <Button size="sm" variant="ghost" leftIcon={<MailPlus className="size-3.5" />} loading={busy === s.id} onClick={() => resend(s)}>Resend invite</Button>}
                          <Button size="icon" variant="ghost" aria-label={`Edit ${s.name}`} title="Edit" onClick={() => setEditing(s)}><Pencil className="size-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label={s.status === 'disabled' ? `Reactivate ${s.name}` : `Deactivate ${s.name}`} title={s.status === 'disabled' ? 'Reactivate' : 'Deactivate'} onClick={() => setToggling(s)}>
                            <Power className={s.status === 'disabled' ? 'size-4 text-success-text' : 'size-4'} />
                          </Button>
                        </div>
                      ) : isOwner ? (
                        <p className="text-right text-xs text-subtle">Changed by support only</p>
                      ) : null}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          </div>
          </>
        )}
      </Card>

      {manage && editing !== null && <StaffDialog key={editing === 'new' ? 'new' : editing.id} open staff={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={toggling !== null}
        onClose={() => setToggling(null)}
        title={toggling?.status === 'disabled' ? `Reactivate ${toggling.name}?` : `Deactivate ${toggling?.name ?? ''}?`}
        confirmLabel={toggling?.status === 'disabled' ? 'Reactivate' : 'Deactivate'}
        tone={toggling?.status === 'disabled' ? 'primary' : 'danger'}
        onConfirm={async () => {
          const s = toggling!;
          await api.post(s.status === 'disabled' ? '/api/v1/staff/{id}/activate' : '/api/v1/staff/{id}/deactivate', { params: { id: s.id } });
          toast.show({ tone: 'success', title: s.status === 'disabled' ? `${s.name} can sign in again` : `${s.name} deactivated` });
          await queryClient.invalidateQueries({ queryKey: ['staff'] });
        }}
      >
        <p>{toggling?.status === 'disabled' ? 'They can sign in again with their password.' : 'They are signed out everywhere straight away and can’t sign in. Their past actions stay in the audit log.'}</p>
      </ConfirmDialog>
    </div>
  );
}
