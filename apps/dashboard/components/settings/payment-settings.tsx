'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Input, Skeleton, Textarea, useToast } from '@fitnexa/ui';
import { ApiError, type GatewayStatus } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { actionMessage, errorRef } from '@/lib/errors';
import { inr, timeAgo } from '@/lib/format';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormAlert } from '@/components/form-alert';
import { formatWhen } from '@/components/money/payment-detail';

const keysSchema = z.object({
  keyId: z.string().trim().regex(/^rzp_(test|live)_[A-Za-z0-9]{8,32}$/, 'Paste the Key Id from Razorpay (starts with rzp_test_)'),
  keySecret: z.string().trim().regex(/^[A-Za-z0-9]{16,64}$/, 'Paste the Key Secret from Razorpay'),
  webhookSecret: z.string().trim().min(8, 'At least 8 characters').max(64),
});

const EVENTS = ['payment.captured', 'order.paid', 'refund.processed', 'refund.failed'];

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-2">
        <code className="flex h-9 min-w-0 flex-1 items-center truncate rounded-md border border-border bg-surface-2 px-3 text-xs">{value}</code>
        <Button
          variant="secondary"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await navigator.clipboard?.writeText(value).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4 text-success-text" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function ConnectForm({ status }: { status: GatewayStatus }) {
  const { api } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof keysSchema>>({ resolver: zodResolver(keysSchema), defaultValues: { keyId: '', keySecret: '', webhookSecret: '' } });
  const submit = handleSubmit(async (v) => {
    setFailure(null);
    try {
      const { data } = await api.put('/api/v1/gym/payment-gateway/razorpay', { body: v });
      queryClient.setQueryData(['gateway'], data);
      toast.show({ tone: 'success', title: 'Razorpay connected', description: 'The desk can now take payments online.' });
    } catch (err) {
      const f = err instanceof ApiError ? err.fieldErrors() : {};
      let hit = false;
      for (const k of ['keyId', 'keySecret', 'webhookSecret'] as const) if (f[k]) { setError(k, { message: f[k]! }); hit = true; }
      if (!hit) setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
      <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-muted marker:text-subtle">
        <li>In the Razorpay dashboard, open <span className="text-fg">Account &amp; Settings → API keys</span> and generate a key (use <span className="text-fg">Test mode</span> first).</li>
        <li>
          Open <span className="text-fg">Webhooks → Add new webhook</span>. Paste the URL below, choose a secret, and tick the events:{' '}
          {EVENTS.map((e) => <code key={e} className="mr-1 rounded-xs bg-surface-2 px-1 text-xs text-fg">{e}</code>)}
        </li>
        <li>Paste the Key Id, Key Secret and the same webhook secret here. Money goes straight to your Razorpay account.</li>
      </ol>
      <CopyField label="Webhook URL" value={status.razorpay.webhookUrl} />
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
        <Input label="Key Id" placeholder="rzp_test_…" autoComplete="off" spellCheck={false} error={formState.errors.keyId?.message} {...register('keyId')} />
        <Input label="Key Secret" type="password" autoComplete="off" error={formState.errors.keySecret?.message} {...register('keySecret')} />
        <Input label="Webhook secret" type="password" autoComplete="off" error={formState.errors.webhookSecret?.message} {...register('webhookSecret')} />
        <p className="flex items-center gap-1.5 text-xs text-subtle"><ShieldCheck className="size-3.5" /> Secrets are stored encrypted and never shown again.</p>
        <Button type="submit" leftIcon={<KeyRound className="size-4" />} loading={formState.isSubmitting} className="w-fit">Connect Razorpay</Button>
        {!status.razorpay.liveAllowed && <p className="text-xs text-subtle">Live keys are switched off on this server for now; use test keys.</p>}
      </form>
    </div>
  );
}

function Alerts() {
  const { api } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const alerts = useQuery({ queryKey: ['gateway', 'alerts'], queryFn: () => api.get('/api/v1/gym/payment-gateway/alerts').then((r) => r.data) });
  const open = alerts.data?.items.filter((a) => a.status === 'duplicate_refund_due') ?? [];
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Duplicate payments" description="If a member pays twice for one order, the second payment is not applied. Refund it in Razorpay, then mark it resolved here." action={alerts.data && <Badge tone={open.length ? 'warning' : 'neutral'}>{open.length} open</Badge>} />
      {alerts.isError ? (
        <p className="px-5 pb-5 text-sm text-muted">{actionMessage(alerts.error)}</p>
      ) : !alerts.data ? (
        <div className="px-5 pb-5"><Skeleton className="h-12" /></div>
      ) : open.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">Nothing to refund.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {open.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
              <AlertTriangle className="hidden size-4 shrink-0 text-warning-text sm:block" />
              <div className="min-w-0 flex-1 text-sm">
                <p><span className="font-medium">{a.memberName}</span> paid {inr(a.amountPaise, true)} twice</p>
                <p className="truncate text-xs text-muted">Refund payment {a.razorpayPaymentId} · {formatWhen(a.createdAt)}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setResolving(a.id)}>Mark refunded</Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={resolving !== null}
        onClose={() => { setResolving(null); setNote(''); setNoteError(null); }}
        title="Mark as refunded?"
        confirmLabel="Mark resolved"
        onConfirm={async () => {
          if (note.trim().length < 3) {
            setNoteError('Add a short note (at least 3 characters)');
            return false;
          }
          await api.post('/api/v1/gym/payment-gateway/alerts/{id}/resolve', { params: { id: resolving! }, body: { note: note.trim() } });
          toast.show({ tone: 'success', title: 'Marked as resolved' });
          await queryClient.invalidateQueries({ queryKey: ['gateway', 'alerts'] });
          void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          setNote('');
        }}
      >
        <p>Only do this after refunding the second payment in the Razorpay dashboard.</p>
        <Textarea label="Note" required rows={2} maxLength={500} value={note} onChange={(e) => { setNote(e.target.value); setNoteError(null); }} placeholder="e.g. Refunded in Razorpay on 18 Nov, rfnd_…" error={noteError ?? undefined} />
      </ConfirmDialog>
    </Card>
  );
}

/** Online payments: connect the gym's own Razorpay account (owner). */
export function PaymentSettings() {
  const { api, can, state } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const gateway = useQuery({ queryKey: ['gateway'], queryFn: () => api.get('/api/v1/gym/payment-gateway').then((r) => r.data) });
  const impersonated = state.status === 'signedIn' && Boolean(state.me.impersonatedBy);

  if (gateway.isError) return <FormAlert tone="danger" message={actionMessage(gateway.error)} />;
  if (!gateway.data) return <Skeleton className="h-64" />;
  const g = gateway.data;
  const rp = g.razorpay;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Razorpay"
          description="Let the desk take UPI, card and netbanking payments online. Desk payments work either way."
          action={rp.connected ? <Badge tone="success" dot>Connected · {rp.mode === 'live' ? 'Live' : 'Test'}</Badge> : <Badge tone="neutral" dot>Not connected</Badge>}
        />
        <CardBody>
          {!g.available ? (
            <FormAlert tone="info" message="Online payments aren’t available on this server yet. Contact support to turn them on." />
          ) : impersonated ? (
            <FormAlert tone="info" message="You’re signed in from the platform as support. Only the owner can connect or disconnect Razorpay." />
          ) : rp.connected ? (
            <div className="flex flex-col gap-4">
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-muted">Key Id</dt><dd className="mt-0.5 font-mono text-xs">{rp.keyId}</dd></div>
                <div><dt className="text-muted">Mode</dt><dd className="mt-0.5 font-medium">{rp.mode === 'live' ? 'Live (real money)' : 'Test (no real money)'}</dd></div>
                <div><dt className="text-muted">Connected</dt><dd className="mt-0.5">{rp.updatedAt ? timeAgo(rp.updatedAt) : '—'}</dd></div>
              </dl>
              <CopyField label="Webhook URL (in Razorpay → Webhooks)" value={rp.webhookUrl} />
              <Button variant="ghost" className="w-fit text-danger-text" onClick={() => setConfirm(true)}>Disconnect Razorpay</Button>
            </div>
          ) : (
            <ConnectForm status={g} />
          )}
        </CardBody>
      </Card>
      {can('payments:refund') && rp.connected && <Alerts />}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Disconnect Razorpay?"
        confirmLabel="Disconnect"
        tone="danger"
        onConfirm={async () => {
          const { data } = await api.delete('/api/v1/gym/payment-gateway/razorpay');
          queryClient.setQueryData(['gateway'], data);
          toast.show({ tone: 'success', title: 'Razorpay disconnected' });
        }}
      >
        <p>The desk can no longer take payments online. Payments already taken are not affected; you can reconnect any time.</p>
      </ConfirmDialog>
    </div>
  );
}
