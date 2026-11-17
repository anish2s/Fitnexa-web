'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button, Input } from '@fitnexa/ui';
import { useAuth } from '@/lib/auth';
import { useSite } from '@/lib/site';
import { errorMessage, errorRef } from '@/lib/errors';
import { FormAlert } from '@/components/form-alert';

const schema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone number').max(254),
  password: z.string().min(1, 'Enter your password').max(128),
});
type Values = z.infer<typeof schema>;

function LoginForm() {
  const site = useSite();
  const { signIn, state } = useAuth();
  const [show, setShow] = useState(false);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);
  const platform = site.scope === 'platform';

  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: '', password: '' } });

  const onSubmit = handleSubmit(async (v) => {
    setFailure(null);
    try {
      await signIn(v.identifier, v.password);
      // The auth layout redirects to ?next= (or home) once signed in.
    } catch (err) {
      setFailure({ message: errorMessage(err), ref: errorRef(err) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{platform ? 'Sign in to the console' : 'Sign in'}</h1>
        <p className="mt-1 text-sm text-muted">{platform ? 'Platform administrators only.' : 'For the gym owner and staff.'}</p>
      </div>

      {state.status === 'signedOut' && state.reason === 'expired' && !failure && (
        <FormAlert tone="info" message="Your session ended. Please sign in again." />
      )}
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}

      <Input
        label={platform ? 'Email' : 'Email or phone'}
        autoComplete="username"
        inputMode={platform ? 'email' : 'text'}
        placeholder={platform ? 'you@fitnexa.in' : 'name@example.com or 98765 43210'}
        error={formState.errors.identifier?.message}
        autoFocus
        {...register('identifier')}
      />
      <Input
        label="Password"
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        error={formState.errors.password?.message}
        rightSlot={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="rounded p-1 text-subtle hover:text-fg"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...register('password')}
      />

      <Button type="submit" size="lg" loading={formState.isSubmitting} leftIcon={<LogIn className="size-4" />}>
        Sign in
      </Button>

      {!platform && (
        <Link href="/forgot-password" className="text-center text-sm font-medium text-accent-text hover:underline">
          Forgot your password?
        </Link>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
