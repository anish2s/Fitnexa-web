'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button, Input } from '@fitnexa/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage, errorRef } from '@/lib/errors';
import { FormAlert } from '@/components/form-alert';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address').max(254) });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { api } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFailure(null);
    try {
      await api.post('/api/v1/auth/password/forgot', { body: { email }, auth: false });
      setSentTo(email);
    } catch (err) {
      setFailure({ message: errorMessage(err), ref: errorRef(err) });
    }
  });

  if (sentTo) {
    // The API answers 202 whether or not the account exists, so we never reveal who has one.
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-1 text-sm text-muted">
            If <span className="font-medium text-fg">{sentTo}</span> belongs to an owner or staff account here, a link to set a new
            password is on its way. It works for 30 minutes.
          </p>
        </div>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">Enter the email on your owner or staff account and we’ll send you a link.</p>
      </div>
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
      <Input label="Email" type="email" autoComplete="email" leftIcon={<Mail />} error={formState.errors.email?.message} autoFocus {...register('email')} />
      <Button type="submit" size="lg" loading={formState.isSubmitting}>Send reset link</Button>
      <Link href="/login" className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </form>
  );
}
