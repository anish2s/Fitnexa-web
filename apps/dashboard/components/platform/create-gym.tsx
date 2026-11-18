'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ExternalLink, IndianRupee, Mail, Phone, XCircle } from 'lucide-react';
import { Button, buttonClasses, Card, CardBody, Input, normalizeHex, Segmented, Select, Spinner } from '@fitnexa/ui';
import { ApiError, type TenantCreated, type Theme } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { applyFieldErrors, actionMessage, errorRef } from '@/lib/errors';
import { rupeesToPaise } from '@/lib/format';
import { gymOrigin } from '@/lib/support-session';
import { useDebounced } from '@/lib/use-debounced';
import { FormAlert } from '@/components/form-alert';
import { PageHeader } from '@/components/page-header';

const SWATCHES = ['#E11D48', '#F97316', '#16A34A', '#0EA5E9', '#2563EB', '#7C3AED', '#DB2777', '#0F172A'];

const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, '3–40 lowercase letters, digits or hyphens; no hyphen at the ends'),
  city: z.string().trim().max(100),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
  phone: z.string().trim().max(20),
  ownerName: z.string().trim().min(1, 'Enter the owner’s name').max(120),
  ownerEmail: z.string().trim().email('Enter a valid email address — the invite goes here'),
  ownerPhone: z.string().trim().max(20),
  planCode: z.string().trim().regex(/^[a-z0-9_-]{0,40}$/, 'Lowercase letters, digits, _ and - only'),
  subscriptionStatus: z.enum(['trialing', 'active', 'past_due', 'cancelled']),
  price: z.string().trim().refine((v) => v === '' || rupeesToPaise(v) !== null, 'Enter an amount like 999'),
});
type Values = z.infer<typeof schema>;

/** "Iron Paradise Gym" → "iron-paradise-gym" (a suggestion; the API has the final say). */
const slugify = (name: string) =>
  name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');

/** API field paths → form fields. */
const API_PATH: Record<string, string> = {
  'owner.name': 'ownerName',
  'owner.email': 'ownerEmail',
  'owner.phone': 'ownerPhone',
  'subscription.planCode': 'planCode',
  'subscription.priceMonthlyPaise': 'price',
  'address.city': 'city',
};

const REASON: Record<string, string> = {
  taken: 'Another gym already uses this address.',
  reserved: 'This address is reserved for the platform.',
  invalid: 'Use 3–40 lowercase letters, digits or hyphens.',
};

const INVITE_ERROR: Record<string, string> = {
  throttled: 'Too many invites were sent recently. Resend it from the gym’s page in a few minutes.',
  send_failed: 'The email couldn’t be sent (is email set up?). Resend it from the gym’s page.',
};

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

function Created({ result }: { result: TenantCreated }) {
  const url = gymOrigin(result.appUrl);
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardBody className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-success-soft text-success-text"><CheckCircle2 className="size-6" /></span>
        <h2 className="text-xl font-semibold">{result.tenant.name} is live</h2>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline">{url.replace(/^https?:\/\//, '')} <ExternalLink className="size-3.5" /></a>
        {result.inviteSent ? (
          <p className="text-sm text-muted">The owner has been emailed an invite to set their password.</p>
        ) : (
          <FormAlert tone="info" message={`The gym was created, but the owner invite wasn’t sent. ${INVITE_ERROR[result.inviteError ?? 'send_failed']}`} className="text-left" />
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href={`/gyms/${result.tenant.id}`} className={buttonClasses()}>Open gym</Link>
          <Link href="/" className={buttonClasses({ variant: 'secondary' })}>All gyms</Link>
        </div>
      </CardBody>
    </Card>
  );
}

export function CreateGym() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [color, setColor] = useState('#6366F1');
  const [theme, setTheme] = useState<Theme>('dark');
  const [slugTouched, setSlugTouched] = useState(false);
  const [created, setCreated] = useState<TenantCreated | null>(null);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const { register, handleSubmit, setError, setValue, control, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', city: '', email: '', phone: '', ownerName: '', ownerEmail: '', ownerPhone: '', planCode: 'pilot', subscriptionStatus: 'trialing', price: '' },
  });
  const errors = formState.errors;
  const name = useWatch({ control, name: 'name' });
  const typedSlug = useWatch({ control, name: 'slug' });
  const slug = useDebounced((typedSlug ?? '').trim().toLowerCase(), 350);

  useEffect(() => {
    if (!slugTouched) setValue('slug', slugify(name));
  }, [name, slugTouched, setValue]);

  const availability = useQuery({
    queryKey: ['platform', 'slug', slug],
    queryFn: () => api.get('/api/v1/platform/tenants/slug-availability', { query: { slug } }).then((r) => r.data),
    enabled: slug.length >= 3,
    staleTime: 10_000,
  });
  const host = typeof window !== 'undefined' ? window.location.hostname.split('.').slice(1).join('.') : '';

  const submit = handleSubmit(async (v) => {
    setFailure(null);
    if (availability.data && !availability.data.available && availability.data.slug === v.slug) {
      setError('slug', { message: REASON[availability.data.reason ?? 'taken']! });
      return;
    }
    if (!normalizeHex(color)) return;
    try {
      const { data } = await api.post('/api/v1/platform/tenants', {
        body: {
          name: v.name,
          slug: v.slug,
          email: v.email || undefined,
          phone: v.phone || undefined,
          address: v.city ? { city: v.city } : undefined,
          branding: { primaryColor: color, defaultTheme: theme },
          subscription: { status: v.subscriptionStatus, planCode: v.planCode || null, priceMonthlyPaise: v.price ? rupeesToPaise(v.price) : null },
          owner: { name: v.ownerName, email: v.ownerEmail, phone: v.ownerPhone || undefined },
        } as never,
      });
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      setCreated(data);
    } catch (err) {
      const fields = ['name', 'slug', 'city', 'email', 'phone', 'ownerName', 'ownerEmail', 'ownerPhone', 'planCode', 'price'] as const;
      if (err instanceof ApiError && (err.code === 'CONFLICT' || err.code === 'DUPLICATE')) {
        setError('slug', { message: err.code === 'CONFLICT' ? err.message : 'That email or address is already in use.' });
        return;
      }
      const mapped =
        err instanceof ApiError && err.code === 'VALIDATION_ERROR' && Array.isArray(err.details)
          ? new ApiError(err.status, err.code, err.message, (err.details as { path: string; message: string }[]).map((d) => ({ ...d, path: API_PATH[d.path] ?? d.path })), err.requestId)
          : err;
      if (!applyFieldErrors(mapped, setError, fields)) setFailure({ message: actionMessage(err), ref: errorRef(err) });
    }
  });

  if (created) return <div className="mx-auto max-w-5xl py-6"><Created result={created} /></div>;

  const a = availability.data?.slug === slug ? availability.data : undefined;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Gyms</Link>
      <PageHeader title="New gym" description="Creates the gym, its web address and the owner’s account. The owner gets an email to set their password." />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
        <Section title="Gym">
          <Input label="Gym name" required error={errors.name?.message} wrapperClassName="sm:col-span-2" autoFocus {...register('name')} />
          <div className="sm:col-span-2">
            <Input
              label="Web address"
              required
              error={errors.slug?.message}
              rightSlot={<span className="pr-1 text-sm text-subtle">.{host}</span>}
              className="pr-36 lowercase"
              hint={
                slug.length < 3 ? 'Members and staff use this address. It can’t be changed later.'
                : availability.isFetching ? <span className="inline-flex items-center gap-1.5"><Spinner className="size-3" /> Checking…</span>
                : a ? (a.available ? <span className="inline-flex items-center gap-1 text-success-text"><CheckCircle2 className="size-3.5" /> Available</span> : <span className="inline-flex items-center gap-1 text-danger-text"><XCircle className="size-3.5" /> {REASON[a.reason ?? 'taken']}</span>)
                : undefined
              }
              {...register('slug', { onChange: () => setSlugTouched(true) })}
            />
          </div>
          <Input label="City" error={errors.city?.message} {...register('city')} />
          <Input label="Gym phone" type="tel" leftIcon={<Phone />} error={errors.phone?.message} {...register('phone')} />
          <Input label="Gym email" type="email" leftIcon={<Mail />} error={errors.email?.message} wrapperClassName="sm:col-span-2" {...register('email')} />
        </Section>

        <Section title="Owner" description="Their account is created as invited. They can add staff once signed in.">
          <Input label="Owner’s name" required error={errors.ownerName?.message} {...register('ownerName')} />
          <Input label="Owner’s email" required type="email" leftIcon={<Mail />} hint="The invite goes here." error={errors.ownerEmail?.message} {...register('ownerEmail')} />
          <Input label="Owner’s phone" type="tel" leftIcon={<Phone />} hint="Optional. They can sign in with it too." error={errors.ownerPhone?.message} {...register('ownerPhone')} />
        </Section>

        <Section title="Branding" description="The owner can change these later in their settings.">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Brand colour</span>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((s) => (
                <button key={s} type="button" aria-label={s} aria-pressed={color === s} onClick={() => setColor(s)} className={`size-8 rounded-full border-2 ring-1 ring-border ${color === s ? 'border-fg' : 'border-transparent'}`} style={{ background: s }} />
              ))}
              <Input aria-label="Hex colour" value={color} maxLength={7} onChange={(e) => setColor(e.target.value)} error={normalizeHex(color) ? undefined : 'Use a hex colour like #7C3AED'} className="font-mono uppercase" wrapperClassName="w-32" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Default theme</span>
            <Segmented size="md" value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'Match device' }]} className="w-fit" />
          </div>
        </Section>

        <Section title="Subscription" description="What this gym pays Fitnexa. Visible only on the platform.">
          <Select label="Status" options={[{ value: 'trialing', label: 'Trial' }, { value: 'active', label: 'Paid' }, { value: 'past_due', label: 'Past due' }, { value: 'cancelled', label: 'Cancelled' }]} {...register('subscriptionStatus')} />
          <Input label="Plan code" placeholder="pilot" error={errors.planCode?.message} {...register('planCode')} />
          <Input label="Monthly price" inputMode="decimal" leftIcon={<IndianRupee />} placeholder="999" error={errors.price?.message} {...register('price')} />
        </Section>

        <div className="flex justify-end gap-2">
          <Link href="/" className={buttonClasses({ variant: 'secondary' })}>Cancel</Link>
          <Button type="submit" loading={formState.isSubmitting}>Create gym</Button>
        </div>
      </form>
    </div>
  );
}
