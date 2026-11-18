'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IndianRupee } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '@fitnexa/ui';
import { ApiError, type Plan, type PlanDuration, type TaxMode } from '@fitnexa/api-client';
import { DURATION_LABEL, paiseToRupees, rupeesToPaise } from '@/lib/format';
import { actionMessage, applyFieldErrors, errorRef } from '@/lib/errors';
import { FormAlert } from '@/components/form-alert';

const schema = z.object({
  name: z.string().trim().min(1, 'Give the plan a name').max(80),
  duration: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']),
  price: z.string().trim().min(1, 'Enter the price').refine((v) => rupeesToPaise(v) !== null, 'Enter an amount like 4500 or 4500.50'),
  taxMode: z.enum(['inclusive', 'exclusive', 'none']),
  gstRate: z.string(),
  description: z.string().trim().max(500),
});
type Values = z.infer<typeof schema>;

const FIELDS = ['name', 'duration', 'price', 'taxMode', 'gstRate', 'description'] as const;

/** API paths → form fields (price is typed in rupees, sent as paise; plan names are unique by nameKey). */
function remapError(err: unknown): unknown {
  if (!(err instanceof ApiError)) return err;
  const rename = (p: string) => (p === 'pricePaise' ? 'price' : p === 'nameKey' ? 'name' : p);
  if (err.code === 'VALIDATION_ERROR' && Array.isArray(err.details)) {
    return new ApiError(err.status, err.code, err.message, (err.details as { path: string; message: string }[]).map((d) => ({ ...d, path: rename(String(d.path)) })), err.requestId);
  }
  if (err.code === 'DUPLICATE') {
    return new ApiError(422, 'VALIDATION_ERROR', err.message, [{ path: 'name', message: 'A plan with this name already exists' }], err.requestId);
  }
  return err;
}

function initial(plan: Plan | null, hasGstin: boolean): Values {
  return plan
    ? {
        name: plan.name,
        duration: plan.duration,
        price: paiseToRupees(plan.pricePaise),
        taxMode: plan.taxMode,
        gstRate: String(plan.taxMode === 'none' ? 18 : plan.gstRate),
        description: plan.description ?? '',
      }
    : { name: '', duration: 'monthly', price: '', taxMode: hasGstin ? 'inclusive' : 'none', gstRate: '18', description: '' };
}

/** Create (plan = null) or edit a plan in a dialog. Render it only while open, keyed by the plan. */
export function PlanForm({
  open,
  plan,
  hasGstin,
  onClose,
  onSave,
}: {
  open: boolean;
  plan: Plan | null;
  hasGstin: boolean;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  // Mounted fresh for each opening (see PlanList), so the defaults are in place from the first frame.
  const { register, handleSubmit, setError, control, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial(plan, hasGstin) });
  const errors = formState.errors;
  const taxMode = useWatch({ control, name: 'taxMode' });

  const submit = handleSubmit(async (v) => {
    setFailure(null);
    const next = {
      name: v.name,
      duration: v.duration as PlanDuration,
      pricePaise: rupeesToPaise(v.price)!,
      taxMode: v.taxMode as TaxMode,
      gstRate: v.taxMode === 'none' ? 0 : Number(v.gstRate),
      description: v.description,
    };
    let body: Record<string, unknown>;
    if (!plan) {
      body = { ...next, description: next.description || undefined, gstRate: next.taxMode === 'none' ? undefined : next.gstRate };
    } else {
      // Only what changed; the API keeps the rest.
      body = {};
      if (next.name !== plan.name) body.name = next.name;
      if (next.duration !== plan.duration) body.duration = next.duration;
      if (next.pricePaise !== plan.pricePaise) body.pricePaise = next.pricePaise;
      if (next.taxMode !== plan.taxMode) body.taxMode = next.taxMode;
      if (next.taxMode !== 'none' && next.gstRate !== plan.gstRate) body.gstRate = next.gstRate;
      if (next.description !== (plan.description ?? '')) body.description = next.description || null;
      if (Object.keys(body).length === 0) return onClose();
    }
    try {
      await onSave(body);
      onClose();
    } catch (err) {
      const mapped = remapError(err);
      if (!applyFieldErrors(mapped, setError, FIELDS)) setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });

  return (
    <Modal
      open={open}
      onClose={() => !formState.isSubmitting && onClose()}
      title={plan ? 'Edit plan' : 'New plan'}
      description={plan ? 'Changes apply to new sales only. Memberships already sold keep their price.' : 'Members choose from these plans when they join or renew.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={formState.isSubmitting}>Cancel</Button>
          <Button type="submit" form="plan-form" loading={formState.isSubmitting}>{plan ? 'Save changes' : 'Create plan'}</Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
        <Input label="Name" required placeholder="e.g. Quarterly" error={errors.name?.message} {...register('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Length" required options={Object.entries(DURATION_LABEL).map(([value, label]) => ({ value, label }))} error={errors.duration?.message} {...register('duration')} />
          <Input label="Price" required inputMode="decimal" leftIcon={<IndianRupee />} placeholder="4500" error={errors.price?.message} {...register('price')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="GST"
            options={[
              { value: 'inclusive', label: 'Included in price', disabled: !hasGstin && plan?.taxMode !== 'inclusive' },
              { value: 'exclusive', label: 'Added on top', disabled: !hasGstin && plan?.taxMode !== 'exclusive' },
              { value: 'none', label: 'No GST' },
            ]}
            hint={hasGstin ? undefined : 'Add your GSTIN in Settings to charge GST.'}
            error={errors.taxMode?.message}
            {...register('taxMode')}
          />
          {taxMode !== 'none' && (
            <Select label="GST rate" options={[5, 12, 18, 28].map((r) => ({ value: String(r), label: `${r}%${r === 18 ? ' (gyms)' : ''}` }))} error={errors.gstRate?.message} {...register('gstRate')} />
          )}
        </div>
        <Textarea label="Description" placeholder="Optional. e.g. Includes locker and one PT session." rows={2} maxLength={500} error={errors.description?.message} {...register('description')} />
      </form>
    </Modal>
  );
}
