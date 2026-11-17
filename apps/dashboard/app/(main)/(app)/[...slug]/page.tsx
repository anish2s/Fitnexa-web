'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { useSite } from '@/lib/site';
import { useAuth } from '@/lib/auth';
import { findRoute, GYM_ROUTES, PLATFORM_ROUTES } from '@/lib/nav';
import { ComingSoon } from '@/components/coming-soon';

/** Menu destinations whose screens arrive in later milestones. Anything else is a real 404. */
export default function PlannedScreen({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);
  const site = useSite();
  const { can } = useAuth();
  const route = findRoute(site.scope === 'gym' ? GYM_ROUTES : PLATFORM_ROUTES, `/${slug.join('/')}`);
  if (!route?.comingIn || (route.permission && !can(route.permission))) notFound();
  return <ComingSoon title={route.label} note={`This screen is planned for ${route.comingIn}.`} />;
}
