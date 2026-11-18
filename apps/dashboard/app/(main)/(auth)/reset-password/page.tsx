'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError } from '@fitexaa/api-client';
import { Button, Input, useToast } from '@fitexaa/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage, errorRef } from '@/lib/errors';
import { FormAlert } from '@/components/form-alert';

// Mirrors the API rule (8–128 characters, not only spaces); the API remains the authority.
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(128, 'Use at most 128 characters')
      .refine((p) => p.trim().length >= 8, 'A password can’t be only spaces'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'The passwords don’t match' });
type Values = z.infer<typeof schema>;

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const router = useRouter();
  const toast = useToast();
  const { api } = useAuth();
  const [failure, setFailure] = useState<{ message: string; ref?: string; badLink?: boolean } | null>(null);
  const { register, handleSubmit, formState, setError } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFailure(null);
    try {
      await api.post('/api/v1/auth/password/reset', { body: { token, password }, auth: false });
      toast.show({ tone: 'success', title: 'Password set', description: 'Sign in with your new password.' });
      router.replace('/login');
    } catch (err) {
      const pw = err instanceof ApiError ? err.fieldErrors().password : undefined;
      if (pw) setError('password', { message: pw });
      else setFailure({ message: errorMessage(err), ref: errorRef(err), badLink: err instanceof ApiError && err.code === 'INVALID_LINK' });
    }
  });

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Link incomplete</h1>
        <p className="text-sm text-muted">Open the link from your email again, or request a new one.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-accent-text hover:underline">Request a new link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Set your password</h1>
        <p className="mt-1 text-sm text-muted">Choose a password of at least 8 characters. You’ll be signed out on other devices.</p>
      </div>
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
      {failure?.badLink && (
        <Link href="/forgot-password" className="-mt-2 text-sm font-medium text-accent-text hover:underline">Request a new link</Link>
      )}
      <Input label="New password" type="password" autoComplete="new-password" error={formState.errors.password?.message} autoFocus {...register('password')} />
      <Input label="Confirm password" type="password" autoComplete="new-password" error={formState.errors.confirm?.message} {...register('confirm')} />
      <Button type="submit" size="lg" loading={formState.isSubmitting}>Save password</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
