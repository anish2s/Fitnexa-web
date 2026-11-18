'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, FileText, Globe, IndianRupee } from 'lucide-react';
import { Button, Input, Modal, Segmented, Textarea } from '@fitexaa/ui';
import { ApiError, newIdempotencyKey, type MembershipView, type PaymentView } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { useSite } from '@/lib/site';
import { actionMessage, applyFieldErrors, errorRef } from '@/lib/errors';
import { inr, paiseToRupees, rupeesToPaise, fullDate } from '@/lib/format';
import { openReceipt } from '@/lib/receipt';
import { runCheckout } from '@/lib/razorpay';
import { FormAlert } from '@/components/form-alert';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank' },
] as const;
type Method = (typeof METHODS)[number]['value'];

const REFERENCE_HINT: Record<Method, string> = {
  cash: '',
  upi: 'UPI reference (optional)',
  card: 'Last 4 digits or slip number (optional)',
  bank_transfer: 'UTR / transaction ID (optional)',
};

const schema = z.object({
  amount: z.string().trim().min(1, 'Enter the amount').refine((v) => (rupeesToPaise(v) ?? 0) > 0, 'Enter an amount like 1500 or 1500.50'),
  reference: z.string().trim().max(100),
  receivedOn: z.string(),
  notes: z.string().trim().max(500),
});
type Values = z.infer<typeof schema>;

/** Membership facts the dialog needs (from a membership view or a check-in result). */
export interface Payable {
  membershipId: string;
  memberId: string;
  memberName: string;
  planName: string;
  balancePaise: number;
}

export const payableOf = (m: MembershipView, memberName: string): Payable => ({
  membershipId: m.id,
  memberId: m.memberId,
  memberName,
  planName: m.plan.name,
  balancePaise: m.balancePaise,
});

/** After a payment: invalidate everything that shows money or memberships. */
export function useMoneyRefresh() {
  const queryClient = useQueryClient();
  return (memberId?: string) => {
    for (const key of [['payments'], ['dashboard'], ['members'], ['memberships'], ['renewals']]) void queryClient.invalidateQueries({ queryKey: key });
    if (memberId) void queryClient.invalidateQueries({ queryKey: ['member', memberId] });
  };
}

function Done({ payment, balancePaise, onClose }: { payment: PaymentView; balancePaise: number; onClose: () => void }) {
  const { api } = useAuth();
  const [failure, setFailure] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-success-soft text-success-text"><CheckCircle2 className="size-6" /></span>
      <div>
        <p className="text-xl font-semibold tabular-nums">{inr(payment.amountPaise, true)} received</p>
        <p className="mt-1 text-sm text-muted tabular-nums">Receipt {payment.receiptNumber}</p>
        <p className="mt-1 text-sm text-muted">{balancePaise > 0 ? `Still due: ${inr(balancePaise, true)}` : 'Fully paid.'}</p>
      </div>
      {failure && <FormAlert tone="danger" message={failure} className="w-full text-left" />}
      <div className="mt-2 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        <Button variant="secondary" leftIcon={<FileText className="size-4" />} onClick={() => openReceipt(api, payment.id, payment.receiptNumber).catch((e) => setFailure(actionMessage(e)))}>
          Receipt (PDF)
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

/**
 * The payment form, usable on its own (CollectPaymentDialog) or as the second step of a sale.
 * Desk payments carry an Idempotency-Key that is kept for retries of the same attempt, so a
 * timeout followed by "try again" can never record the money twice.
 */
export function PaymentForm({ payable, onPaid, onSkip, skipLabel = 'Cancel' }: { payable: Payable; onPaid: (p: PaymentView, balancePaise: number) => void; onSkip: () => void; skipLabel?: string }) {
  const { api, can } = useAuth();
  const site = useSite();
  const refresh = useMoneyRefresh();
  const [method, setMethod] = useState<Method>('cash');
  const [key, setKey] = useState(newIdempotencyKey);
  const [busy, setBusy] = useState<'desk' | 'online' | null>(null);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const [showDate, setShowDate] = useState(false);
  const { register, handleSubmit, setError, getValues, trigger, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: payable.balancePaise > 0 ? paiseToRupees(payable.balancePaise) : '', reference: '', receivedOn: '', notes: '' },
  });
  const errors = formState.errors;

  // Owners can see whether Razorpay is connected; staff find out when they try.
  const gateway = useQuery({
    queryKey: ['gateway'],
    queryFn: () => api.get('/api/v1/gym/payment-gateway').then((r) => r.data),
    enabled: can('gym:update'),
    staleTime: 60_000,
  });
  const onlineKnownOff = gateway.data ? !gateway.data.razorpay.connected : false;

  const fields = ['amount', 'reference', 'receivedOn', 'notes'] as const;
  const fail = (err: unknown) => {
    const mapped =
      err instanceof ApiError && err.code === 'VALIDATION_ERROR'
        ? new ApiError(err.status, err.code, err.message, (err.details as { path: string; message: string }[]).map((d) => ({ ...d, path: d.path === 'amountPaise' ? 'amount' : d.path === 'receivedAt' ? 'receivedOn' : d.path })), err.requestId)
        : err;
    if (!applyFieldErrors(mapped, setError, fields)) setFailure({ message: actionMessage(err), ref: errorRef(err) });
  };

  const submit = handleSubmit(async (v) => {
    setFailure(null);
    setBusy('desk');
    try {
      const { data } = await api.post('/api/v1/memberships/{id}/payments', {
        params: { id: payable.membershipId },
        idempotencyKey: key,
        body: {
          amountPaise: rupeesToPaise(v.amount)!,
          method,
          reference: method !== 'cash' && v.reference ? v.reference : undefined,
          receivedAt: v.receivedOn ? new Date(`${v.receivedOn}T12:00:00`).toISOString() : undefined,
          notes: v.notes || undefined,
        } as never,
      });
      refresh(payable.memberId);
      setKey(newIdempotencyKey());
      onPaid(data, data.membership.balancePaise);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  });

  async function payOnline() {
    setFailure(null);
    if (!(await trigger('amount'))) return;
    const amountPaise = rupeesToPaise(getValues('amount'))!;
    setBusy('online');
    try {
      const { data: order } = await api.post('/api/v1/memberships/{id}/razorpay-order', { params: { id: payable.membershipId }, body: { amountPaise } });
      const color = site.scope === 'gym' ? site.tenant.branding.primaryColor : '#6366F1';
      const outcome = await runCheckout(order, color);
      if (outcome.kind === 'dismissed') return;
      if (outcome.kind === 'failed') {
        setFailure({ message: outcome.message });
        return;
      }
      const { data: payment } = await api.post('/api/v1/payments/razorpay/verify', { body: { orderId: outcome.orderId, paymentId: outcome.paymentId, signature: outcome.signature } });
      refresh(payable.memberId);
      const { data: detail } = await api.get('/api/v1/payments/{id}', { params: { id: payment.id } });
      onPaid(payment, detail.membership.balancePaise);
    } catch (err) {
      setFailure({ message: err instanceof ApiError ? actionMessage(err) : err instanceof Error ? err.message : actionMessage(err), ref: errorRef(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm">
        <span className="min-w-0 truncate text-muted">{payable.memberName} · {payable.planName}</span>
        <span className="shrink-0 font-medium tabular-nums">{payable.balancePaise > 0 ? `${inr(payable.balancePaise, true)} due` : 'Nothing due'}</span>
      </div>
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}

      <Input label="Amount" required inputMode="decimal" leftIcon={<IndianRupee />} error={errors.amount?.message} autoFocus {...register('amount')} />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Paid by</span>
        <Segmented size="md" value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m.value, label: m.label }))} className="w-full [&>button]:flex-1" />
      </div>
      {method !== 'cash' && <Input label="Reference" placeholder={REFERENCE_HINT[method]} maxLength={100} error={errors.reference?.message} {...register('reference')} />}

      {showDate ? (
        <Input label="Received on" type="date" hint="For money taken earlier (up to 90 days back)." error={errors.receivedOn?.message} {...register('receivedOn')} />
      ) : (
        <button type="button" onClick={() => setShowDate(true)} className="w-fit text-sm font-medium text-accent-text hover:underline">Received on an earlier day?</button>
      )}
      <Textarea label="Notes" rows={2} maxLength={500} placeholder="Optional" error={errors.notes?.message} {...register('notes')} />

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={busy !== null}>{skipLabel}</Button>
        {can('payments:record') && !onlineKnownOff && (
          <Button type="button" variant="secondary" leftIcon={<Globe className="size-4" />} loading={busy === 'online'} disabled={busy === 'desk'} onClick={payOnline} className="sm:ml-auto">
            Pay online
          </Button>
        )}
        <Button type="submit" leftIcon={<CreditCard className="size-4" />} loading={busy === 'desk'} disabled={busy === 'online'} className={onlineKnownOff ? 'sm:ml-auto' : ''}>
          Record payment
        </Button>
      </div>
      {onlineKnownOff && <p className="text-xs text-subtle">Online payments are off: connect Razorpay in Settings to take UPI/card payments through Razorpay.</p>}
    </form>
  );
}

/** "Collect payment" for an existing membership. */
export function CollectPaymentDialog({ open, payable, onClose }: { open: boolean; payable: Payable | null; onClose: () => void }) {
  const [paid, setPaid] = useState<{ payment: PaymentView; balancePaise: number } | null>(null);
  const close = () => {
    setPaid(null);
    onClose();
  };
  return (
    <Modal open={open && payable !== null} onClose={close} title={paid ? 'Payment recorded' : 'Collect payment'} description={paid ? undefined : 'Records the money and issues a numbered receipt.'}>
      {payable && (paid ? <Done payment={paid.payment} balancePaise={paid.balancePaise} onClose={close} /> : <PaymentForm payable={payable} onPaid={(payment, balancePaise) => setPaid({ payment, balancePaise })} onSkip={close} />)}
    </Modal>
  );
}

export { Done as PaymentDone };
export const formatPeriod = (m: Pick<MembershipView, 'startDate' | 'endDate'>) => `${fullDate(m.startDate)} – ${fullDate(m.endDate)}`;
