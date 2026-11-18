'use client';

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSite } from '@/lib/site';

/**
 * Hides a gym screen from people without the permission (and from the platform host) as a 404, the
 * same as the menu. UI only: the API enforces every permission regardless.
 */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const site = useSite();
  const { can } = useAuth();
  if (site.scope !== 'gym' || !can(permission)) notFound();
  return <>{children}</>;
}
