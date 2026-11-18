'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, LogIn, Mail, UserRound } from 'lucide-react';
import { Button, Input } from '@fitexaa/ui';
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

  // Taller, roomier fields than the dashboard default, to match the sign-in screen's scale.
  const field = 'h-12! rounded-xl! bg-surface-2/80! text-md! pl-11! [&+span]:right-3';

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text" aria-hidden>
            <UserRound className="size-5" />
          </span>
          {platform ? 'Sign in to the console' : 'Sign in'}
        </h1>
        <p className="mt-2 text-md text-muted">
          {platform ? 'Platform administrators only.' : 'Please enter your credentials to continue.'}
        </p>
      </div>

      {state.status === 'signedOut' && state.reason === 'expired' && !failure && (
        <FormAlert tone="info" message="Your session ended. Please sign in again." />
      )}
      {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}

      <Input
        label={platform ? 'Email' : 'Email or phone'}
        autoComplete="username"
        inputMode={platform ? 'email' : 'text'}
        placeholder={platform ? 'you@fitexaa.in' : 'name@example.com or 98765 43210'}
        leftIcon={<Mail />}
        className={field}
        error={formState.errors.identifier?.message}
        autoFocus
        {...register('identifier')}
      />
      <Input
        label="Password"
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        leftIcon={<Lock />}
        className={field}
        error={formState.errors.password?.message}
        rightSlot={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="rounded-md p-1.5 text-subtle hover:text-fg"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...register('password')}
      />

      <Button
        type="submit"
        size="lg"
        loading={formState.isSubmitting}
        leftIcon={<LogIn className="size-5" />}
        className="mt-1 h-13! rounded-xl! bg-[linear-gradient(90deg,var(--accent),color-mix(in_oklab,var(--accent)_85%,white))] text-lg! hover:brightness-110 font-semibold shadow-glow"
      >
        Sign in
      </Button>

      {!platform && (
        <Link href="/forgot-password" className="-mt-2 text-center text-sm font-medium text-accent-text hover:underline">
          Forgot your password?
        </Link>
      )}

      <div className="flex flex-col items-center gap-3 border-t border-border pt-5 text-sm text-muted">
        <p className="flex items-center gap-2.5">
          {(platform ? ['Gyms', 'Members', 'Payments'] : ['Stay Fit', 'Stay Healthy', 'Stay Happy']).map((w, i) => (
            <span key={w} className="flex items-center gap-2.5">
              {i > 0 && <span className="size-1 rounded-full bg-accent" aria-hidden />}
              {w}
            </span>
          ))}
        </p>
      </div>
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
