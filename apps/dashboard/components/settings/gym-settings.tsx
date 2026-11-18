'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Phone } from 'lucide-react';
import { Button, Card, CardBody, Checkbox, Input, Select, Skeleton, useToast } from '@fitnexa/ui';
import type { GymView } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { useGym } from '@/lib/queries';
import { actionMessage, applyFieldErrors, errorRef } from '@/lib/errors';
import { phoneForInput } from '@/lib/format';
import { FormAlert } from '@/components/form-alert';

const text = (max: number) => z.string().trim().max(max);
const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(120),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address').max(254)]),
  phone: text(20),
  address: z.object({ line1: text(200), line2: text(200), city: text(100), state: text(100), postalCode: text(12) }),
  settings: z.object({
    timezone: z.string().min(1),
    gstin: z.string().trim().toUpperCase().refine((v) => v === '' || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), 'Enter a valid 15-character GSTIN'),
    receiptPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,10}$/, 'Letters and digits only, up to 10'),
    renewalReminderDays: z.coerce.number().int().min(0, '0 to 60 days').max(60, '0 to 60 days'),
    renewalRemindersEnabled: z.boolean(),
  }),
});
type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;

const FIELDS = ['name', 'email', 'phone', 'address.line1', 'address.line2', 'address.city', 'address.state', 'address.postalCode', 'settings.timezone', 'settings.gstin', 'settings.receiptPrefix', 'settings.renewalReminderDays', 'settings.renewalRemindersEnabled'] as const;

function initial(g: GymView): Parsed {
  return {
    name: g.name,
    email: g.email ?? '',
    phone: phoneForInput(g.phone),
    address: { line1: g.address.line1 ?? '', line2: g.address.line2 ?? '', city: g.address.city ?? '', state: g.address.state ?? '', postalCode: g.address.postalCode ?? '' },
    settings: {
      timezone: g.settings.timezone,
      gstin: g.settings.gstin ?? '',
      receiptPrefix: g.settings.receiptPrefix,
      renewalReminderDays: g.settings.renewalReminderDays,
      renewalRemindersEnabled: g.settings.renewalRemindersEnabled,
    },
  };
}

/** PATCH body with only what changed; emptied optional fields are sent as null. */
function diff(v: Parsed, b: Parsed) {
  const body: Record<string, unknown> = {};
  const orNull = (s: string) => s || null;
  if (v.name !== b.name) body.name = v.name;
  if (v.email !== b.email) body.email = orNull(v.email);
  if (v.phone !== b.phone) body.phone = orNull(v.phone);
  const address: Record<string, unknown> = {};
  for (const k of ['line1', 'line2', 'city', 'state', 'postalCode'] as const) if (v.address[k] !== b.address[k]) address[k] = orNull(v.address[k]);
  if (Object.keys(address).length) body.address = address;
  const settings: Record<string, unknown> = {};
  if (v.settings.timezone !== b.settings.timezone) settings.timezone = v.settings.timezone;
  if (v.settings.gstin !== b.settings.gstin) settings.gstin = orNull(v.settings.gstin);
  if (v.settings.receiptPrefix !== b.settings.receiptPrefix) settings.receiptPrefix = v.settings.receiptPrefix;
  if (v.settings.renewalReminderDays !== b.settings.renewalReminderDays) settings.renewalReminderDays = v.settings.renewalReminderDays;
  if (v.settings.renewalRemindersEnabled !== b.settings.renewalRemindersEnabled) settings.renewalRemindersEnabled = v.settings.renewalRemindersEnabled;
  if (Object.keys(settings).length) body.settings = settings;
  return body;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[220px_1fr] lg:gap-8">
        <div>
          <h2 className="text-md font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <div className="grid content-start gap-4 sm:grid-cols-2">{children}</div>
      </CardBody>
    </Card>
  );
}

function GymForm({ gym }: { gym: GymView }) {
  const { api } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [before, setBefore] = useState(() => initial(gym));
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const { register, handleSubmit, setError, reset, formState } = useForm<Values, unknown, Parsed>({ resolver: zodResolver(schema), defaultValues: before });
  const errors = formState.errors;
  const zones = useMemo(() => {
    const all: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['Asia/Kolkata'];
    return all.includes(before.settings.timezone) ? all : [before.settings.timezone, ...all];
  }, [before.settings.timezone]);

  const submit = handleSubmit(async (v) => {
    setFailure(null);
    const body = diff(v, before);
    if (Object.keys(body).length === 0) return toast.show({ tone: 'info', title: 'Nothing changed' });
    try {
      const { data } = await api.patch('/api/v1/gym', { body: body as never });
      queryClient.setQueryData(['gym'], data);
      const next = initial(data);
      setBefore(next);
      reset(next);
      toast.show({ tone: 'success', title: 'Gym details saved' });
      if (body.name) router.refresh(); // the name is in the page title and sidebar (server-rendered)
    } catch (err) {
      if (!applyFieldErrors(err, setError, FIELDS)) setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
      <Section title="Gym" description="Shown to members in the app and on receipts.">
        <Input label="Gym name" required error={errors.name?.message} wrapperClassName="sm:col-span-2" {...register('name')} />
        <Input label="Email" type="email" leftIcon={<Mail />} error={errors.email?.message} {...register('email')} />
        <Input label="Phone" type="tel" leftIcon={<Phone />} error={errors.phone?.message} {...register('phone')} />
      </Section>
      <Section title="Address" description="Printed on receipts.">
        <Input label="Address line 1" error={errors.address?.line1?.message} wrapperClassName="sm:col-span-2" {...register('address.line1')} />
        <Input label="Address line 2" error={errors.address?.line2?.message} wrapperClassName="sm:col-span-2" {...register('address.line2')} />
        <Input label="City" error={errors.address?.city?.message} {...register('address.city')} />
        <Input label="State" error={errors.address?.state?.message} {...register('address.state')} />
        <Input label="PIN code" inputMode="numeric" error={errors.address?.postalCode?.message} {...register('address.postalCode')} />
      </Section>
      <Section title="Billing" description="GST and receipt numbering. Changes apply to new sales and receipts only.">
        <Input label="GSTIN" placeholder="27AAPFU0939F1ZV" hint="Needed to charge GST on plans. Leave empty if not registered." className="uppercase" error={errors.settings?.gstin?.message} {...register('settings.gstin')} />
        <Input label="Receipt prefix" placeholder="RCPT" hint="Receipts look like RCPT/2026-27/0042." className="uppercase" error={errors.settings?.receiptPrefix?.message} {...register('settings.receiptPrefix')} />
        <Select label="Time zone" options={zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))} hint="Decides “today” for check-ins, renewals and reports." error={errors.settings?.timezone?.message} wrapperClassName="sm:col-span-2" {...register('settings.timezone')} />
      </Section>
      <Section title="Renewal reminders" description="Emails members before their membership ends (sent 09:00–20:00 gym time).">
        <Checkbox label="Send renewal reminder emails" description="Members without an email are skipped; use WhatsApp from Renewals for them." wrapperClassName="sm:col-span-2" {...register('settings.renewalRemindersEnabled')} />
        <Input label="Days before the end" type="number" min={0} max={60} hint="Also the “Expiring soon” window on Renewals and the Overview." error={errors.settings?.renewalReminderDays?.message} {...register('settings.renewalReminderDays')} />
      </Section>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={!formState.isDirty || formState.isSubmitting} onClick={() => reset(before)}>Discard changes</Button>
        <Button type="submit" loading={formState.isSubmitting}>Save changes</Button>
      </div>
    </form>
  );
}

export function GymSettings() {
  const gym = useGym();
  if (gym.isError) return <FormAlert tone="danger" message={actionMessage(gym.error)} />;
  if (!gym.data) return <div className="flex flex-col gap-4" aria-busy><Skeleton className="h-48" /><Skeleton className="h-48" /></div>;
  return <GymForm gym={gym.data} />;
}
