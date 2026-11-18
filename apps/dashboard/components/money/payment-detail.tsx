'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { FileText, IndianRupee, Undo2 } from 'lucide-react';
import { Badge, Button, Input, Modal, Segmented, Skeleton, Textarea, type BadgeTone } from '@fitnexa/ui';
import { ApiError, newIdempotencyKey, type PaymentDetail } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { useMember } from '@/lib/queries';
import { actionMessage, applyFieldErrors, errorRef } from '@/lib/errors';
import { fullDate, inr, METHOD_LABEL, paiseToRupees, rupeesToPaise } from '@/lib/format';
import { openReceipt } from '@/lib/receipt';
import { FormAlert } from '@/components/form-alert';
import { useMoneyRefresh } from './collect-payment';

const dateTime = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const formatWhen = (iso: string) => dateTime.format(new Date(iso));

const REFUND_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  processed: { label: 'Refunded', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
};

const refundSchema = z.object({
  amount: z.string().trim().min(1, 'Enter the amount').refine((v) => (rupeesToPaise(v) ?? 0) > 0, 'Enter an amount like 500'),
  reason: z.string().trim().min(3, 'Say why (at least 3 characters)').max(500),
});

function RefundForm({ payment, onDone, onCancel }: { payment: PaymentDetail; onDone: (p: PaymentDetail) => void; onCancel: () => void }) {
  const { api } = useAuth();
  const refresh = useMoneyRefresh();
  const online = payment.method === 'razorpay';
  const left = payment.amountPaise - payment.refundedPaise;
  const [method, setMethod] = useState<'cash' | 'upi' | 'bank_transfer'>(payment.method === 'upi' || payment.method === 'bank_transfer' ? payment.method : 'cash');
  const [key, setKey] = useState(newIdempotencyKey);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof refundSchema>>({ resolver: zodResolver(refundSchema), defaultValues: { amount: paiseToRupees(left), reason: '' } });

  const submit = handleSubmit(async (v) => {
    setFailure(null);
    try {
      const { data } = await api.post('/api/v1/payments/{id}/refunds', {
        params: { id: payment.id },
        idempotencyKey: key,
        body: { amountPaise: rupeesToPaise(v.amount)!, reason: v.reason, method: online ? undefined : method },
      });
      setKey(newIdempotencyKey());
      refresh(payment.memberId);
      onDone(data);
    } catch (err) {
      const mapped =
        err instanceof ApiError && err.code === 'VALIDATION_ERROR'
          ? new ApiError(err.status, err.code, err.message, (err.details as { path: string; message: string }[]).map((d) => ({ ...d, path: d.path === 'amountPaise' ? 'amount' : d.path })), err.requestId)
          : err;
      if (!applyFieldErrors(mapped, setError, ['amount', 'reason'])) setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormAlert
        tone="info"
        message={
          online
            ? `Refunded through Razorpay to the original card/UPI. Up to ${inr(left, true)} can be refunded.`
            : `Hand the money back, then record it here. Up to ${inr(left, true)} can be refunded. The membership is not cancelled; cancel it separately if needed.`
        }
      />
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
      <Input label="Refund amount" required inputMode="decimal" leftIcon={<IndianRupee />} error={formState.errors.amount?.message} autoFocus {...register('amount')} />
      {!online && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Refunded by</span>
          <Segmented size="md" value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank' }]} className="w-full [&>button]:flex-1" />
        </div>
      )}
      <Textarea label="Reason" required rows={2} maxLength={500} placeholder="e.g. Member moved city" error={formState.errors.reason?.message} {...register('reason')} />
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={formState.isSubmitting}>Back</Button>
        <Button type="submit" variant="danger" loading={formState.isSubmitting}>Record refund</Button>
      </div>
    </form>
  );
}

function MemberName({ id }: { id: string }) {
  const member = useMember(id);
  return <>{member.data ? `${member.data.name} · ${member.data.memberCode}` : 'Open profile'}</>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

/** One payment: receipt, membership balance, refunds, and the refund action (payments:refund). */
export function PaymentDetailDialog({ paymentId, onClose }: { paymentId: string | null; onClose: () => void }) {
  const { api, can } = useAuth();
  const [refunding, setRefunding] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const payment = useQuery({
    queryKey: ['payments', 'detail', paymentId],
    queryFn: () => api.get('/api/v1/payments/{id}', { params: { id: paymentId! } }).then((r) => r.data),
    enabled: paymentId !== null,
  });
  const close = () => {
    setRefunding(false);
    setReceiptError(null);
    onClose();
  };
  const p = payment.data?.id === paymentId ? payment.data : undefined;
  const left = p ? p.amountPaise - p.refundedPaise : 0;

  return (
    <Modal open={paymentId !== null} onClose={close} title={refunding ? 'Refund' : (p?.receiptNumber ?? 'Payment')} description={p && !refunding ? `${inr(p.amountPaise, true)} · ${METHOD_LABEL[p.method] ?? p.method} · ${formatWhen(p.receivedAt)}` : undefined}>
      {payment.isError ? (
        <FormAlert tone="danger" message={actionMessage(payment.error)} />
      ) : !p ? (
        <div className="flex flex-col gap-3" aria-busy><Skeleton className="h-6 w-48" /><Skeleton className="h-32" /></div>
      ) : refunding ? (
        <RefundForm payment={p} onDone={() => { setRefunding(false); void payment.refetch(); }} onCancel={() => setRefunding(false)} />
      ) : (
        <div className="flex flex-col gap-4">
          {receiptError && <FormAlert tone="danger" message={receiptError} />}
          <dl className="divide-y divide-border">
            <Row label="Member">
              <Link href={`/members/${p.memberId}`} className="font-medium hover:underline" onClick={close}><MemberName id={p.memberId} /></Link>
            </Row>
            <Row label="Membership">{p.membership.plan.name} · {fullDate(p.membership.startDate)} – {fullDate(p.membership.endDate)}</Row>
            {p.reference && <Row label="Reference">{p.reference}</Row>}
            {p.gateway && <Row label="Razorpay">{p.gateway.paymentId}</Row>}
            {p.notes && <Row label="Notes">{p.notes}</Row>}
            <Row label="Membership total">{inr(p.membership.totalPaise, true)}</Row>
            <Row label="Paid so far">{inr(p.membership.paidPaise, true)}</Row>
            <Row label="Balance due">
              <span className={p.membership.balancePaise > 0 ? 'font-medium text-warning-text' : ''}>{p.membership.balancePaise > 0 ? inr(p.membership.balancePaise, true) : p.membership.balancePaise < 0 ? `Overpaid ${inr(-p.membership.balancePaise, true)}` : 'None'}</span>
            </Row>
          </dl>

          {p.refunds.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Refunds</h3>
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                {p.refunds.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums">{r.refundNumber}</p>
                      <p className="text-xs text-muted">{formatWhen(r.refundedAt)} · {METHOD_LABEL[r.method] ?? r.method}{r.reason ? ` · ${r.reason}` : ''}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="tabular-nums">−{inr(r.amountPaise, true)}</span>
                      <Badge tone={REFUND_STATUS[r.status]?.tone ?? 'neutral'}>{REFUND_STATUS[r.status]?.label ?? r.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            {can('payments:refund') && left > 0 && (
              <Button variant="ghost" leftIcon={<Undo2 className="size-4" />} onClick={() => setRefunding(true)} className="sm:mr-auto">Refund</Button>
            )}
            <Button variant="secondary" leftIcon={<FileText className="size-4" />} onClick={() => openReceipt(api, p.id, p.receiptNumber).catch((e) => setReceiptError(actionMessage(e)))}>Receipt (PDF)</Button>
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
