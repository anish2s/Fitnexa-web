'use client';

import { useSite } from '@/lib/site';
import { useAuth } from '@/lib/auth';
import { GymOverview } from '@/components/overview/gym-overview';
import { PlatformGymList } from '@/components/platform/gym-list';
import { ComingSoon } from '@/components/coming-soon';

/** Home: the gym's Overview on a gym host, the gym list on the platform host. */
export default function HomePage() {
  const site = useSite();
  const { can } = useAuth();
  if (site.scope === 'platform') return <PlatformGymList />;
  if (!can('dashboard:read')) return <ComingSoon title="Welcome" note="Your account has no overview access. Use the menu to get started." />;
  return <GymOverview />;
}
