'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Laptop, LogOut, Smartphone } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Input, Skeleton, useToast } from '@fitexaa/ui';
import { ApiError, type SessionInfo } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { actionMessage, errorRef } from '@/lib/errors';
import { phone, timeAgo } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/nav';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormAlert } from '@/components/form-alert';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'At least 8 characters').max(128).refine((p) => p.trim().length >= 8, 'A password can’t be only spaces'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'The passwords don’t match' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a password different from the current one' });

/** "Chrome on Windows" from a user-agent string; good enough to recognise your own devices. */
export function describeDevice(ua: string | null): { label: string; mobile: boolean } {
  if (!ua) return { label: 'Unknown device', mobile: false };
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : null;
  const label = browser && os ? `${browser} on ${os}` : browser ?? os ?? ua.slice(0, 40);
  return { label, mobile: /Mobile|Android|iPhone/.test(ua) };
}

function ChangePassword({ blocked }: { blocked: boolean }) {
  const { api } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [show, setShow] = useState(false);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const { register, handleSubmit, setError, reset, formState } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const submit = handleSubmit(async (v) => {
    setFailure(null);
    try {
      await api.post('/api/v1/auth/password/change', { body: { currentPassword: v.currentPassword, newPassword: v.newPassword } });
      reset();
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.show({ tone: 'success', title: 'Password changed', description: 'Your other devices have been signed out.' });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        setError('currentPassword', { message: 'That isn’t your current password' });
        return;
      }
      const f = err instanceof ApiError ? err.fieldErrors() : {};
      if (f.newPassword) setError('newPassword', { message: f.newPassword });
      else setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });
  const toggle = (
    <button type="button" onClick={() => setShow((s) => !s)} className="rounded-md p-1.5 text-subtle hover:text-fg" aria-label={show ? 'Hide passwords' : 'Show passwords'}>
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
  return (
    <Card>
      <CardHeader title="Password" description="Changing it signs you out everywhere else." />
      <CardBody>
        {blocked ? (
          <FormAlert tone="info" message="You’re signed in from the platform as support. The owner’s password can’t be changed in this session." />
        ) : (
          <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-4">
            {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
            <Input label="Current password" type={show ? 'text' : 'password'} autoComplete="current-password" rightSlot={toggle} error={formState.errors.currentPassword?.message} {...register('currentPassword')} />
            <Input label="New password" type={show ? 'text' : 'password'} autoComplete="new-password" hint="At least 8 characters." error={formState.errors.newPassword?.message} {...register('newPassword')} />
            <Input label="Confirm new password" type={show ? 'text' : 'password'} autoComplete="new-password" error={formState.errors.confirm?.message} {...register('confirm')} />
            <Button type="submit" loading={formState.isSubmitting} className="w-fit">Change password</Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function Sessions({ blocked }: { blocked: boolean }) {
  const { api, signOut } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.get('/api/v1/auth/sessions').then((r) => r.data) });
  const all: SessionInfo[] = sessions.data ?? [];
  // The current device first, then most recently used.
  const sorted = [...all].sort((a, b) => Number(b.current) - Number(a.current) || (b.lastUsedAt ?? b.createdAt).localeCompare(a.lastUsedAt ?? a.createdAt));
  const rows = showAll ? sorted : sorted.slice(0, 6);

  async function end(s: SessionInfo) {
    setBusy(s.id);
    try {
      await api.delete('/api/v1/auth/sessions/{id}', { params: { id: s.id } });
      toast.show({ tone: 'success', title: 'Signed out of that device' });
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t sign that device out', description: actionMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Where you’re signed in"
        description="Sign out of any device you don’t recognise."
        action={!blocked && all.length > 1 && <Button variant="secondary" size="sm" leftIcon={<LogOut className="size-4" />} onClick={() => setConfirmAll(true)}>Sign out everywhere</Button>}
      />
      {sessions.isError ? (
        <p className="px-5 pb-5 text-sm text-muted">{actionMessage(sessions.error)}</p>
      ) : !sessions.data ? (
        <div className="flex flex-col gap-2 px-5 pb-5">{[0, 1].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {rows.map((s) => {
            const d = describeDevice(s.userAgent);
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">{d.mobile ? <Smartphone className="size-4" /> : <Laptop className="size-4" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {d.label}
                    {s.current && <Badge tone="success">This device</Badge>}
                    {s.impersonated && <Badge tone="warning">Support session</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {s.lastUsedAt ? `Active ${timeAgo(s.lastUsedAt)}` : `Signed in ${timeAgo(s.createdAt)}`}{s.ip ? ` · ${s.ip.replace(/^::ffff:/, '')}` : ''}
                  </p>
                </div>
                {!s.current && !blocked && (
                  <Button variant="ghost" size="sm" loading={busy === s.id} onClick={() => end(s)}>Sign out</Button>
                )}
              </li>
            );
          })}
          {sorted.length > rows.length && (
            <li className="px-5 py-2.5">
              <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>Show all {sorted.length} devices</Button>
            </li>
          )}
        </ul>
      )}
      <ConfirmDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Sign out everywhere?"
        confirmLabel="Sign out everywhere"
        tone="danger"
        onConfirm={async () => {
          await api.post('/api/v1/auth/logout-all');
          await signOut();
        }}
      >
        <p>Every device, including this one, is signed out. You’ll need your password to sign in again.</p>
      </ConfirmDialog>
    </Card>
  );
}

/** Your own account: who you are, password, and devices. Everyone (owner, staff, super admin). */
export function AccountSettings() {
  const { state } = useAuth();
  if (state.status !== 'signedIn') return null;
  const { me } = state;
  const blocked = Boolean(me.impersonatedBy);
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Your details" description="Ask the gym owner to change your name, email or phone." />
        <CardBody>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-muted">Name</dt><dd className="mt-0.5 font-medium">{me.user.name}</dd></div>
            <div><dt className="text-muted">Role</dt><dd className="mt-0.5 font-medium">{me.scope === 'platform' ? 'Super admin' : (ROLE_LABEL[me.user.role] ?? me.user.role)}</dd></div>
            <div className="min-w-0"><dt className="text-muted">Email</dt><dd className="mt-0.5 truncate font-medium">{me.user.email ?? '—'}</dd></div>
            <div><dt className="text-muted">Phone</dt><dd className="mt-0.5 font-medium tabular-nums">{phone(me.user.phone)}</dd></div>
          </dl>
        </CardBody>
      </Card>
      <ChangePassword blocked={blocked} />
      <Sessions blocked={blocked} />
    </div>
  );
}
