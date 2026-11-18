'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Building2, ExternalLink, IndianRupee, LogIn, MailPlus, PauseCircle, PlayCircle, ShieldAlert } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Select, Skeleton, Textarea, useToast, cn, type BadgeTone } from '@fitexaa/ui';
import { ApiError, type ApiClient, type GymView, type PlatformTenantDetail } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { actionMessage, errorMessage, errorRef } from '@/lib/errors';
import { fullDate, inr, num, paiseToRupees, phone, rupeesToPaise, timeAgo } from '@/lib/format';
import { gymOrigin, SUPPORT_READY, SUPPORT_TOKEN } from '@/lib/support-session';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormAlert } from '@/components/form-alert';
import { AuditLog } from '@/components/audit/audit-log';
import { GymForm } from '@/components/settings/gym-settings';
import { BrandingForm } from '@/components/settings/branding-settings';

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
const OWNER_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'info' },
  disabled: { label: 'Disabled', tone: 'neutral' },
};

/**
 * Opens the gym's site in a new tab and hands it an owner session ("log in as owner").
 * The tab is opened inside the click (so pop-up blockers allow it), the API issues the token, and
 * the token is posted only to that tab, only at the gym's origin, after the tab says it's ready.
 */
async function startSupportSession(api: ApiClient, tenantId: string, appUrl: string, reason: string): Promise<void> {
  const tab = window.open('', '_blank');
  if (!tab) throw new Error('popup');
  let grant;
  try {
    grant = (await api.post('/api/v1/platform/tenants/{id}/impersonate', { params: { id: tenantId }, body: { reason } })).data;
  } catch (err) {
    tab.close();
    throw err;
  }
  const origin = gymOrigin(grant.appUrl ?? appUrl);
  await new Promise<void>((resolve, reject) => {
    const done = (fn: () => void) => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      fn();
    };
    const onMessage = (e: MessageEvent<{ type?: string }>) => {
      if (e.source !== tab || e.origin !== origin || e.data?.type !== SUPPORT_READY) return;
      tab.postMessage({ type: SUPPORT_TOKEN, accessToken: grant.accessToken, user: grant.user, expiresIn: grant.expiresIn }, origin);
      done(resolve);
    };
    const timer = setTimeout(() => done(() => reject(new Error('timeout'))), 30_000);
    window.addEventListener('message', onMessage);
    tab.location.href = `${origin}/support-session`;
  });
}

const subSchema = z.object({
  status: z.enum(['trialing', 'active', 'past_due', 'cancelled']),
  planCode: z.string().trim().regex(/^[a-z0-9_-]{0,40}$/, 'Lowercase letters, digits, _ and - only'),
  price: z.string().trim().refine((v) => v === '' || rupeesToPaise(v) !== null, 'Enter an amount like 999'),
  periodEnd: z.string(),
});

function SubscriptionForm({ gym, onSaved }: { gym: GymView; onSaved: (g: GymView) => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const sub = gym.subscription;
  const { register, handleSubmit, formState } = useForm<z.infer<typeof subSchema>>({
    resolver: zodResolver(subSchema),
    defaultValues: {
      status: sub.status as 'trialing',
      planCode: sub.planCode ?? '',
      price: sub.priceMonthlyPaise === null || sub.priceMonthlyPaise === undefined ? '' : paiseToRupees(sub.priceMonthlyPaise),
      periodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.slice(0, 10) : '',
    },
  });
  const submit = handleSubmit(async (v) => {
    setFailure(null);
    try {
      const { data } = await api.patch('/api/v1/platform/tenants/{id}', {
        params: { id: gym.id },
        body: { subscription: { status: v.status, planCode: v.planCode || null, priceMonthlyPaise: v.price ? rupeesToPaise(v.price) : null, currentPeriodEnd: v.periodEnd || null } } as never,
      });
      onSaved(data);
      toast.show({ tone: 'success', title: 'Subscription saved' });
    } catch (err) {
      setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });
  return (
    <Card>
      <CardHeader title="Fitexaa subscription" description="What this gym pays the platform. Owners don’t see this." />
      <CardBody>
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} className="sm:col-span-2 lg:col-span-4" />}
          <Select label="Status" options={[{ value: 'trialing', label: 'Trial' }, { value: 'active', label: 'Paid' }, { value: 'past_due', label: 'Past due' }, { value: 'cancelled', label: 'Cancelled' }]} {...register('status')} />
          <Input label="Plan code" error={formState.errors.planCode?.message} {...register('planCode')} />
          <Input label="Monthly price" inputMode="decimal" leftIcon={<IndianRupee />} error={formState.errors.price?.message} {...register('price')} />
          <Input label="Paid until" type="date" {...register('periodEnd')} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={formState.isSubmitting} disabled={!formState.isDirty}>Save subscription</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{children}</dd>
    </div>
  );
}

function Overview({ d, onResend, resending }: { d: PlatformTenantDetail; onResend: () => void; resending: boolean }) {
  const t = d.tenant;
  const addr = [t.address.line1, t.address.line2, t.address.city, t.address.state, t.address.postalCode].filter(Boolean).join(', ');
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card className="overflow-hidden">
          <CardHeader title={d.owners.length === 1 ? 'Owner' : 'Owners'} />
          {d.owners.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No owner account.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {d.owners.map((o) => (
                <li key={o.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">{o.name} <Badge tone={OWNER_STATUS[o.status]?.tone ?? 'neutral'} dot>{OWNER_STATUS[o.status]?.label ?? o.status}</Badge></p>
                    <p className="truncate text-sm text-muted">{o.email ?? '—'} · {phone(o.phone)}</p>
                    <p className="text-xs text-subtle">{o.lastLoginAt ? `Last signed in ${timeAgo(o.lastLoginAt)}` : o.status === 'invited' ? 'Hasn’t accepted the invite yet' : 'Never signed in'}</p>
                  </div>
                  {o.status === 'invited' && <Button size="sm" variant="secondary" leftIcon={<MailPlus className="size-4" />} loading={resending} onClick={onResend}>Resend invite</Button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Gym details" />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="Email">{t.email ?? '—'}</Fact>
              <Fact label="Phone">{phone(t.phone)}</Fact>
              <Fact label="Address">{addr || '—'}</Fact>
              <Fact label="Time zone">{t.settings.timezone}</Fact>
              <Fact label="GSTIN">{t.settings.gstin ?? 'Not registered'}</Fact>
              <Fact label="Created">{fullDate(t.createdAt.slice(0, 10))}</Fact>
            </dl>
          </CardBody>
        </Card>
      </div>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Accounts" />
          <CardBody className="grid grid-cols-3 gap-2">
            {(['owner', 'staff', 'member'] as const).map((k) => (
              <div key={k} className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs text-muted capitalize">{k === 'member' ? 'Members (app)' : k}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{num(d.userCounts[k])}</p>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Subscription" action={<Badge tone={SUB[t.subscription.status]?.tone ?? 'neutral'}>{SUB[t.subscription.status]?.label ?? t.subscription.status}</Badge>} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Plan">{t.subscription.planCode ?? '—'}</Fact>
              <Fact label="Monthly">{t.subscription.priceMonthlyPaise != null ? inr(t.subscription.priceMonthlyPaise) : '—'}</Fact>
              <Fact label="Paid until">{t.subscription.currentPeriodEnd ? fullDate(t.subscription.currentPeriodEnd.slice(0, 10)) : '—'}</Fact>
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

type Tab = 'overview' | 'details' | 'branding' | 'audit';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'details', label: 'Details' },
  { value: 'branding', label: 'Branding' },
  { value: 'audit', label: 'Audit log' },
];

/** One gym, from the platform console. */
export function GymDetail({ id }: { id: string }) {
  const { api } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'overview') as Tab;
  const [dialog, setDialog] = useState<'suspend' | 'activate' | 'impersonate' | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const detail = useQuery({
    queryKey: ['platform', 'tenant', id],
    queryFn: () => api.get('/api/v1/platform/tenants/{id}', { params: { id } }).then((r) => r.data),
  });

  const saved = (g: GymView) => {
    queryClient.setQueryData<PlatformTenantDetail>(['platform', 'tenant', id], (d) => (d ? { ...d, tenant: g } : d));
    void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
  };
  const closeDialog = () => {
    setDialog(null);
    setReason('');
    setReasonError(null);
  };

  if (detail.isError) {
    const gone = detail.error instanceof ApiError && (detail.error.status === 404 || detail.error.code === 'VALIDATION_ERROR');
    return <Card className="mx-auto max-w-5xl"><EmptyState icon={gone ? <Building2 /> : <AlertTriangle />} title={gone ? 'Gym not found' : 'Couldn’t load this gym'} description={gone ? undefined : errorMessage(detail.error)} action={<Link href="/" className="text-sm font-medium text-accent-text hover:underline">All gyms</Link>} /></Card>;
  }
  if (!detail.data) return <div className="mx-auto flex max-w-6xl flex-col gap-5" aria-busy><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;

  const d = detail.data;
  const t = d.tenant;
  const site = gymOrigin(d.appUrl);
  const suspended = t.status === 'suspended';

  async function resend() {
    setResending(true);
    try {
      const { data } = await api.post('/api/v1/platform/tenants/{id}/owner-invite', { params: { id } });
      toast.show(data.sent ? { tone: 'success', title: 'Invite sent again' } : { tone: 'warning', title: 'The invite wasn’t sent', description: data.reason === 'throttled' ? 'Too many invites recently; try again in a few minutes.' : 'The email couldn’t be sent.' });
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t send the invite', description: actionMessage(err) });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Gyms</Link>

      <Card>
        <CardBody className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-semibold text-white" style={{ background: t.branding.primaryColor }} aria-hidden>
            {t.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{t.name}</h1>
              <Badge tone={STATUS[t.status]?.tone ?? 'neutral'} dot>{STATUS[t.status]?.label ?? t.status}</Badge>
              <Badge tone={SUB[t.subscription.status]?.tone ?? 'neutral'}>{SUB[t.subscription.status]?.label ?? t.subscription.status}</Badge>
            </div>
            <a href={site} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm text-accent-text hover:underline">{site.replace(/^https?:\/\//, '')} <ExternalLink className="size-3.5" /></a>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<LogIn className="size-4" />} disabled={suspended} title={suspended ? 'Reactivate the gym first' : undefined} onClick={() => setDialog('impersonate')}>Log in as owner</Button>
            {suspended ? (
              <Button variant="secondary" leftIcon={<PlayCircle className="size-4" />} onClick={() => setDialog('activate')}>Reactivate</Button>
            ) : (
              <Button variant="ghost" className="text-danger-text" leftIcon={<PauseCircle className="size-4" />} onClick={() => setDialog('suspend')}>Suspend</Button>
            )}
          </div>
        </CardBody>
      </Card>

      {suspended && (
        <div role="status" className="flex gap-3 rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm">
          <PauseCircle className="mt-0.5 size-4 shrink-0 text-danger-text" />
          <p><span className="font-medium">Suspended{t.suspendedAt ? ` on ${fullDate(t.suspendedAt.slice(0, 10))}` : ''}.</span> <span className="text-muted">Nobody at this gym can use the app until it is reactivated.{t.suspendedReason ? ` Reason: ${t.suspendedReason}` : ''}</span></p>
        </div>
      )}

      <div role="tablist" aria-label="Gym" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        {TABS.map((x) => (
          <button key={x.value} role="tab" type="button" aria-selected={tab === x.value} onClick={() => router.replace(x.value === 'overview' ? pathname : `${pathname}?tab=${x.value}`, { scroll: false })} className={cn('-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap', tab === x.value ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}>
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview d={d} onResend={resend} resending={resending} />}
      {tab === 'details' && (
        <div className="flex flex-col gap-5">
          <GymForm key={t.updatedAt} gym={t} save={async (body) => { const { data } = await api.patch('/api/v1/platform/tenants/{id}', { params: { id }, body: body as never }); saved(data); return data; }} />
          <SubscriptionForm key={`sub-${t.updatedAt}`} gym={t} onSaved={saved} />
        </div>
      )}
      {tab === 'branding' && (
        <BrandingForm key={t.updatedAt} gym={t} saveVia={async (body) => { const { data } = await api.patch('/api/v1/platform/tenants/{id}/branding', { params: { id }, body: body as never }); saved(data); return data; }} />
      )}
      {tab === 'audit' && <AuditLog source={{ kind: 'tenant', tenantId: id }} embedded />}

      <ConfirmDialog
        open={dialog === 'impersonate'}
        onClose={closeDialog}
        title={`Log in as the owner of ${t.name}?`}
        confirmLabel="Open gym as owner"
        onConfirm={async () => {
          if (reason.trim().length < 10) {
            setReasonError('Give a reason of at least 10 characters, e.g. a ticket number');
            return false;
          }
          try {
            await startSupportSession(api, id, d.appUrl, reason.trim());
          } catch (err) {
            if (err instanceof Error && err.message === 'popup') throw new ApiError(0, 'POPUP_BLOCKED', 'Your browser blocked the new tab. Allow pop-ups for this site and try again.');
            if (err instanceof Error && err.message === 'timeout') throw new ApiError(0, 'HANDOFF_TIMEOUT', 'The gym’s tab didn’t respond. Close it and try again.');
            throw err;
          }
          toast.show({ tone: 'info', title: 'Support session opened in a new tab', description: 'It lasts 15 minutes and can’t be extended.' });
          setReason('');
        }}
      >
        <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning-text" />
          <p>The gym opens in a new tab with the owner’s access for 15 minutes. The owner sees everything you do in their audit log, and a banner stays on screen the whole time.</p>
        </div>
        <Textarea label="Reason" required rows={2} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(null); }} placeholder="e.g. Ticket #142: owner can’t find last month’s receipts" error={reasonError ?? undefined} />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'suspend'}
        onClose={closeDialog}
        title={`Suspend ${t.name}?`}
        confirmLabel="Suspend gym"
        tone="danger"
        onConfirm={async () => {
          if (reason.trim().length < 3) {
            setReasonError('Say why (at least 3 characters)');
            return false;
          }
          const { data } = await api.post('/api/v1/platform/tenants/{id}/suspend', { params: { id }, body: { reason: reason.trim() } });
          saved(data);
          toast.show({ tone: 'success', title: `${t.name} suspended` });
          setReason('');
        }}
      >
        <p>The owner, staff and members are stopped on their next action and see that access is paused. Nothing is deleted; reactivate any time.</p>
        <Textarea label="Reason" required rows={2} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(null); }} placeholder="e.g. Subscription unpaid since October" error={reasonError ?? undefined} />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'activate'}
        onClose={closeDialog}
        title={`Reactivate ${t.name}?`}
        confirmLabel="Reactivate"
        onConfirm={async () => {
          const { data } = await api.post('/api/v1/platform/tenants/{id}/activate', { params: { id } });
          saved(data);
          toast.show({ tone: 'success', title: `${t.name} is active again` });
        }}
      >
        <p>Everyone at the gym can use the app again straight away.</p>
      </ConfirmDialog>
    </div>
  );
}
