'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, ShieldCheck, Smartphone } from 'lucide-react';
import { Button, buttonClasses, Card, CardBody, Checkbox, Input, Select, Textarea } from '@fitnexa/ui';
import type { MemberDetail } from '@fitnexa/api-client';
import { applyFieldErrors, actionMessage, errorRef } from '@/lib/errors';
import { GENDER_LABEL, phoneForInput } from '@/lib/format';
import { FormAlert } from '@/components/form-alert';

/**
 * Consent wording shown at registration. The API records the version ("v1") with who recorded it
 * and when; change the wording only together with MEMBER_CONSENT_VERSION in the backend.
 */
export const CONSENT_V1 =
  'The member agrees that the gym may store their details (name, contact details, date of birth, emergency contact, ' +
  'photo, memberships, payments and visits) to manage their membership, and may contact them about it. They can ask ' +
  'the gym to see, correct or delete their details at any time.';

const optionalText = (max: number) => z.string().trim().max(max);
const date = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Use a date like 2026-04-01');

/** Shape checks only; the API owns the rules (phone format, date ranges, uniqueness). */
const schema = z
  .object({
    name: z.string().trim().min(1, 'Enter the member’s name').max(120),
    phone: z.string().trim().min(1, 'Enter a phone number').max(20),
    email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address').max(254)]),
    gender: z.string(),
    dateOfBirth: date,
    joinDate: date,
    emergencyContact: z.object({ name: optionalText(120), phone: optionalText(20), relation: optionalText(40) }),
    notes: optionalText(1000),
    consent: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const ec = v.emergencyContact;
    if ((ec.phone || ec.relation) && !ec.name) ctx.addIssue({ code: 'custom', path: ['emergencyContact', 'name'], message: 'Add the contact’s name' });
    if ((ec.name || ec.relation) && !ec.phone) ctx.addIssue({ code: 'custom', path: ['emergencyContact', 'phone'], message: 'Add the contact’s phone number' });
  });

export type MemberFormValues = z.infer<typeof schema>;

const FIELDS = ['name', 'phone', 'email', 'gender', 'dateOfBirth', 'joinDate', 'emergencyContact.name', 'emergencyContact.phone', 'emergencyContact.relation', 'emergencyContact', 'notes', 'consent'] as const;

function initialValues(m?: MemberDetail): MemberFormValues {
  return {
    name: m?.name ?? '',
    phone: phoneForInput(m?.phone),
    email: m?.email ?? '',
    gender: m?.gender ?? '',
    dateOfBirth: m?.dateOfBirth ?? '',
    joinDate: m?.joinDate ?? '',
    emergencyContact: {
      name: m?.emergencyContact?.name ?? '',
      phone: phoneForInput(m?.emergencyContact?.phone),
      relation: m?.emergencyContact?.relation ?? '',
    },
    notes: m?.notes ?? '',
    consent: false,
  };
}

/** Request body for POST /members: empty optional fields are left out. */
export function toCreateBody(v: MemberFormValues) {
  const ec = v.emergencyContact;
  return {
    name: v.name,
    phone: v.phone,
    email: v.email || undefined,
    gender: (v.gender || undefined) as 'male' | undefined,
    dateOfBirth: v.dateOfBirth || undefined,
    joinDate: v.joinDate || undefined,
    emergencyContact: ec.name ? { name: ec.name, phone: ec.phone, relation: ec.relation || undefined } : undefined,
    notes: v.notes || undefined,
    consent: true as const,
  };
}

/** Request body for PATCH /members/:id: only what changed; a cleared optional field is sent as null. */
export function toUpdateBody(v: MemberFormValues, before: MemberFormValues) {
  const body: Record<string, unknown> = {};
  const orNull = (s: string) => s || null;
  if (v.name !== before.name) body.name = v.name;
  if (v.phone !== before.phone) body.phone = v.phone;
  if (v.email !== before.email) body.email = orNull(v.email);
  if (v.gender !== before.gender) body.gender = orNull(v.gender);
  if (v.dateOfBirth !== before.dateOfBirth) body.dateOfBirth = orNull(v.dateOfBirth);
  if (v.joinDate !== before.joinDate && v.joinDate) body.joinDate = v.joinDate;
  if (JSON.stringify(v.emergencyContact) !== JSON.stringify(before.emergencyContact)) {
    const ec = v.emergencyContact;
    body.emergencyContact = ec.name ? { name: ec.name, phone: ec.phone, relation: ec.relation || undefined } : null;
  }
  if (v.notes !== before.notes) body.notes = orNull(v.notes);
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
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </CardBody>
    </Card>
  );
}

/**
 * Register (no `member`) or edit a member. `onSubmit` sends the request and returns nothing; it
 * throws the ApiError so field errors land on the right inputs.
 */
export function MemberForm({
  member,
  cancelHref,
  onSubmit,
}: {
  member?: MemberDetail;
  cancelHref: string;
  onSubmit: (values: MemberFormValues, before: MemberFormValues) => Promise<void>;
}) {
  const editing = Boolean(member);
  const [before] = useState(() => initialValues(member));
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const { register, handleSubmit, setError, control, formState } = useForm<MemberFormValues>({
    resolver: zodResolver(schema),
    defaultValues: before,
  });
  const errors = formState.errors;
  const email = useWatch({ control, name: 'email' });

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    if (!editing && !values.consent) {
      setError('consent', { message: 'Ask the member and tick this box before saving' });
      return;
    }
    try {
      await onSubmit(values, before);
    } catch (err) {
      if (!applyFieldErrors(err, setError, FIELDS)) setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}

      <Section title="Member" description="Name and phone are required. The phone number is how the front desk finds them.">
        <Input label="Full name" required autoComplete="off" error={errors.name?.message} wrapperClassName="sm:col-span-2" autoFocus={!editing} {...register('name')} />
        <Input label="Phone" required type="tel" inputMode="tel" leftIcon={<Phone />} placeholder="98765 43210" hint="Indian numbers without +91 are fine." error={errors.phone?.message} {...register('phone')} />
        <Input
          label="Email"
          type="email"
          inputMode="email"
          leftIcon={<Mail />}
          placeholder="name@example.com"
          error={errors.email?.message}
          hint={
            <span className="inline-flex items-center gap-1">
              <Smartphone className="size-3.5" aria-hidden />
              {email ? 'They can sign in to the member app with this email.' : 'Needed for the member app. Without it, the front desk manages everything.'}
            </span>
          }
          {...register('email')}
        />
        <Select label="Gender" placeholder="Not recorded" options={Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label }))} error={errors.gender?.message} {...register('gender')} />
        <Input label="Date of birth" type="date" error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
        <Input label="Join date" type="date" hint={editing ? undefined : 'Leave empty for today. Back-date it for existing members.'} error={errors.joinDate?.message} {...register('joinDate')} />
      </Section>

      <Section title="Emergency contact" description="Optional. Who to call if something happens at the gym.">
        <Input label="Name" autoComplete="off" error={errors.emergencyContact?.name?.message} {...register('emergencyContact.name')} />
        <Input label="Relation" placeholder="e.g. Spouse, Father" error={errors.emergencyContact?.relation?.message} {...register('emergencyContact.relation')} />
        <Input label="Phone" type="tel" inputMode="tel" leftIcon={<Phone />} error={errors.emergencyContact?.phone?.message ?? (errors.emergencyContact as { message?: string } | undefined)?.message} {...register('emergencyContact.phone')} />
      </Section>

      <Section title="Notes" description="Only staff see these. Never shown to the member.">
        <Textarea label="Staff notes" placeholder="Injuries, goals, preferred trainer…" rows={3} maxLength={1000} error={errors.notes?.message} wrapperClassName="sm:col-span-2" {...register('notes')} />
      </Section>

      {!editing && (
        <Card className="border-accent-ring/50">
          <CardBody className="flex gap-4 p-5 sm:p-6">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text sm:flex" aria-hidden>
              <ShieldCheck className="size-5" />
            </span>
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-md font-semibold">Member’s consent</h2>
                <p className="mt-1 text-sm text-muted">Read this to the member, or let them read it, before saving.</p>
              </div>
              <blockquote className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-fg">{CONSENT_V1}</blockquote>
              <Checkbox label="The member has agreed to this" error={errors.consent?.message} {...register('consent')} />
            </div>
          </CardBody>
        </Card>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-border bg-bg/90 px-4 py-3 backdrop-blur max-sm:[&>*]:flex-1 sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Link href={cancelHref} className={buttonClasses({ variant: 'secondary' })}>Cancel</Link>
        <Button type="submit" loading={formState.isSubmitting}>{editing ? 'Save changes' : 'Add member'}</Button>
      </div>
    </form>
  );
}
