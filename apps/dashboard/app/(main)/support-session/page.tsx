'use client';

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, Card, Spinner } from '@fitnexa/ui';
import type { SessionUser } from '@fitnexa/api-client';
import { useAuth } from '@/lib/auth';
import { useSite } from '@/lib/site';
import { errorMessage } from '@/lib/errors';
import { SUPPORT_READY, SUPPORT_TOKEN } from '@/lib/support-session';


const noSubscribe = () => () => {};
/** Whether a window (the platform console) opened this tab. Assumed yes while rendering on the server. */
const useHasOpener = () => useSyncExternalStore(noSubscribe, () => window.opener !== null, () => true);

type TokenMessage = { type: typeof SUPPORT_TOKEN; accessToken: string; user: SessionUser; expiresIn: number };

function Frame({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <Card className="flex w-full max-w-md flex-col items-center gap-3 p-8 text-center">
        {icon}
        <h1 className="text-lg font-semibold">{title}</h1>
        {children}
      </Card>
    </main>
  );
}

/**
 * Receives a "log in as owner" session from the platform console. The token arrives by postMessage
 * from the window that opened this tab (never in the URL, never stored), and is accepted only if the
 * API confirms it is a support session for this gym.
 */
function SupportSession() {
  const site = useSite();
  const params = useSearchParams();
  const router = useRouter();
  const { adoptSupportSession } = useAuth();
  const [status, setStatus] = useState<'waiting' | 'failed'>('waiting');
  const [error, setError] = useState('');
  const handled = useRef(false);
  const ended = params.get('ended') === '1';
  const hasOpener = useHasOpener();

  useEffect(() => {
    if (ended || site.scope !== 'gym') return;
    const opener = window.opener as Window | null;
    if (!opener) return; // explained below
    const onMessage = async (e: MessageEvent<TokenMessage>) => {
      if (e.source !== opener || e.data?.type !== SUPPORT_TOKEN || handled.current) return;
      handled.current = true;
      try {
        await adoptSupportSession(e.data.accessToken, e.data.user, e.data.expiresIn);
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error && err.message === 'not a support session' ? 'That wasn’t a valid support session for this gym.' : errorMessage(err));
        setStatus('failed');
      }
    };
    window.addEventListener('message', onMessage);
    // Nothing secret here: just "ready". The console checks this tab's origin before replying.
    opener.postMessage({ type: SUPPORT_READY }, '*');
    const timeout = setTimeout(() => {
      if (!handled.current) {
        setError('The console didn’t send the session. Close this tab and try “Log in as owner” again.');
        setStatus('failed');
      }
    }, 20_000);
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timeout);
    };
  }, [ended, site.scope, adoptSupportSession, router]);

  if (site.scope !== 'gym') notFound();
  if (ended) {
    return (
      <Frame icon={<ShieldCheck className="size-8 text-success-text" />} title="Support session ended">
        <p className="text-sm text-muted">You’re no longer signed in as the owner of {site.tenant.name}. Everything you did is in the gym’s audit log.</p>
        <Button variant="secondary" onClick={() => window.close()}>Close this tab</Button>
      </Frame>
    );
  }
  if (!hasOpener || status === 'failed') {
    return (
      <Frame icon={<ShieldAlert className="size-8 text-danger-text" />} title="Couldn’t start the support session">
        <p className="text-sm text-muted">{hasOpener ? error : 'Open this from the platform console with “Log in as owner”.'}</p>
      </Frame>
    );
  }
  return (
    <Frame icon={<Spinner className="size-6 text-accent-text" />} title={`Opening ${site.tenant.name} as the owner…`}>
      <p className="text-sm text-muted">A support session started from the platform console.</p>
    </Frame>
  );
}

export default function SupportSessionPage() {
  return (
    <Suspense>
      <SupportSession />
    </Suspense>
  );
}
