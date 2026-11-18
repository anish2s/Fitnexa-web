'use client';

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { useSite } from '@/lib/site';
import { useAuth } from '@/lib/auth';

/** Platform-console screens: 404 on gym hosts and for anyone but a super admin. UI only; the API enforces it. */
export function RequirePlatform({ children }: { children: ReactNode }) {
  const site = useSite();
  const { state } = useAuth();
  // Platform users have no role field; /auth/me marks them with scope "platform".
  if (site.scope !== 'platform' || (state.status === 'signedIn' && state.me.scope !== 'platform')) notFound();
  return <>{children}</>;
}
