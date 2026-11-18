'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee } from 'lucide-react';
import { Badge, Button, Input, Modal, Segmented, Select, Skeleton, Textarea } from '@fitexaa/ui';
import { ApiError, type MembershipSale, type MembershipSummary, type PaymentView } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { actionMessage, applyFieldErrors, errorRef } from '@/lib/errors';
import { DURATION_LABEL, fullDate, inr, MONTHS_LABEL, rupeesToPaise, TAX_LABEL } from '@/lib/format';
import { FormAlert } from '@/components/form-alert';
import { PaymentDone, PaymentForm, payableOf, useMoneyRefresh } from './collect-payment';

const schema = z.object({
  planId: z.string().min(1, 'Choose a plan'),
  startDate: z.string(),
  discount: z.string().trim().refine((v) => v === '' || rupeesToPaise(v) !== null, 'Enter an amount like 500'),
  notes: z.string().trim().max(500),
});
type Values = z.infer<typeof schema>;
type StartFrom = 'auto' | 'expiry' | 'today';

export interface SaleTarget {
  memberId: string;
  memberName: string;
  /** The member's current membership summary decides "sell" vs "renew" and the defaults. */
  summary: MembershipSummary;
}

/** Plan picker + details; the API prices the sale (discount before GST), so totals come from it. */
function SaleForm({ target, onSold, onCancel }: { target: SaleTarget; onSold: (m: MembershipSale) => void; onCancel: () => void }) {
  const { api } = useAuth();
  const refresh = useMoneyRefresh();
  const current = target.summary.current;
  const renewing = Boolean(current);
  /** The API's automatic choice: follow on while current/upcoming, otherwise start today. */
  const lapsed = target.summary.status === 'expired';
  const [startFrom, setStartFrom] = useState<StartFrom>('auto');
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);

  const plans = useQuery({
    queryKey: ['plans', 'current'],
    queryFn: () => api.get('/api/v1/plans', { query: { archived: 'false', limit: 100 } }).then((r) => r.data),
  });
  const lastPlanId = current?.plan.id ?? '';
  const { register, handleSubmit, setError, control, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { planId: plans.data?.some((p) => p.id === lastPlanId) ? lastPlanId : (plans.data?.[0]?.id ?? ''), startDate: '', discount: '', notes: '' },
    resetOptions: { keepDirtyValues: true },
  });
  const errors = formState.errors;
  const planId = useWatch({ control, name: 'planId' });
  const plan = plans.data?.find((p) => p.id === planId);

  const submit = handleSubmit(async (v) => {
    setFailure(null);
    const discountPaise = v.discount ? rupeesToPaise(v.discount)! : undefined;
    try {
      const { data } = renewing
        ? await api.post('/api/v1/members/{id}/memberships/renew', {
            params: { id: target.memberId },
            body: { planId: v.planId, startFrom: startFrom === 'auto' ? undefined : startFrom, discountPaise, notes: v.notes || undefined },
          })
        : await api.post('/api/v1/members/{id}/memberships', {
            params: { id: target.memberId },
            body: { planId: v.planId, startDate: v.startDate || undefined, discountPaise, notes: v.notes || undefined } as never,
          });
      refresh(target.memberId);
      onSold(data);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        const d = err.details as { endDate?: string; availableFrom?: string } | undefined;
        setFailure({ message: d?.availableFrom ? `${err.message}. The next membership can start on ${fullDate(d.availableFrom)}.` : actionMessage(err) });
        return;
      }
      const mapped =
        err instanceof ApiError && err.code === 'VALIDATION_ERROR'
          ? new ApiError(err.status, err.code, err.message, (err.details as { path: string; message: string }[]).map((d) => ({ ...d, path: d.path === 'discountPaise' ? 'discount' : d.path })), err.requestId)
          : err;
      if (!applyFieldErrors(mapped, setError, ['planId', 'startDate', 'discount', 'notes'])) setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });

  if (plans.isError) return <FormAlert tone="danger" message={actionMessage(plans.error)} />;
  if (!plans.data) return <div className="flex flex-col gap-3" aria-busy><Skeleton className="h-10" /><Skeleton className="h-24" /><Skeleton className="h-10" /></div>;
  if (plans.data.length === 0) return <FormAlert tone="info" message="There are no plans to sell yet. The owner can create them under Plans." />;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
      <Select
        label="Plan"
        required
        options={plans.data.map((p) => ({ value: p.id, label: `${p.name} · ${MONTHS_LABEL(p.months)} · ${inr(p.breakdown.totalPaise)}` }))}
        error={errors.planId?.message}
        {...register('planId')}
      />
      {plan && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm">
          <span className="text-muted">{DURATION_LABEL[plan.duration]} · <Badge tone={plan.taxMode === 'none' ? 'neutral' : 'accent'}>{TAX_LABEL[plan.taxMode]}</Badge></span>
          <span className="font-semibold tabular-nums">{inr(plan.breakdown.totalPaise)}</span>
        </div>
      )}

      {renewing ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Starts</span>
          <Segmented
            size="md"
            value={startFrom}
            onChange={setStartFrom}
            options={[
              { value: 'auto', label: 'Automatic' },
              { value: 'expiry', label: 'After current ends' },
              { value: 'today', label: 'Today' },
            ]}
            className="w-full [&>button]:flex-1"
          />
          <p className="text-xs text-subtle">
            {startFrom === 'today'
              ? 'Starts today. Not possible while a membership is still running.'
              : startFrom === 'expiry'
                ? `Starts the day after ${fullDate(current!.endDate)}${lapsed ? ', even though that has passed (a lapse isn’t free)' : ', with no gap'}.`
                : lapsed
                  ? `The last membership ended on ${fullDate(current!.endDate)}, so it starts today.`
                  : `Starts the day after ${fullDate(current!.endDate)}, with no gap.`}
          </p>
        </div>
      ) : (
        <Input label="Start date" type="date" hint="Leave empty for today. Up to a year back or 90 days ahead." error={errors.startDate?.message} {...register('startDate')} />
      )}

      <Input label="Discount" inputMode="decimal" leftIcon={<IndianRupee />} placeholder="0" hint="Taken off the price before GST. The exact total is shown next." error={errors.discount?.message} {...register('discount')} />
      <Textarea label="Notes" rows={2} maxLength={500} placeholder="Optional, staff only" error={errors.notes?.message} {...register('notes')} />

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={formState.isSubmitting}>Cancel</Button>
        <Button type="submit" loading={formState.isSubmitting}>{renewing ? 'Renew membership' : 'Sell membership'}</Button>
      </div>
    </form>
  );
}

/**
 * Sell (no membership yet) or renew. Two steps: the API creates the membership and prices it, then
 * the desk collects the exact balance (or skips; the balance shows as due).
 */
export function SellMembershipDialog({ open, target, onClose }: { open: boolean; target: SaleTarget | null; onClose: () => void }) {
  const [sold, setSold] = useState<MembershipSale | null>(null);
  const [paid, setPaid] = useState<{ payment: PaymentView; balancePaise: number } | null>(null);
  const close = () => {
    setSold(null);
    setPaid(null);
    onClose();
  };
  const renewing = Boolean(target?.summary.current);
  const title = paid ? 'Payment recorded' : sold ? 'Collect payment' : renewing ? 'Renew membership' : 'Sell membership';
  const description = paid
    ? undefined
    : sold
      ? `${sold.plan.name}, ${fullDate(sold.startDate)} – ${fullDate(sold.endDate)}. Total ${inr(sold.totalPaise, true)}${sold.discountPaise ? ` after ${inr(sold.discountPaise, true)} discount` : ''}${sold.gstPaise ? ` incl. ${inr(sold.gstPaise, true)} GST` : ''}.`
      : target ? `For ${target.memberName}` : undefined;

  return (
    <Modal open={open && target !== null} onClose={close} title={title} description={description}>
      {target &&
        (paid ? (
          <PaymentDone payment={paid.payment} balancePaise={paid.balancePaise} onClose={close} />
        ) : sold ? (
          <PaymentForm payable={payableOf(sold, target.memberName)} onPaid={(payment, balancePaise) => setPaid({ payment, balancePaise })} onSkip={close} skipLabel="Collect later" />
        ) : (
          <SaleForm target={target} onSold={setSold} onCancel={close} />
        ))}
    </Modal>
  );
}
