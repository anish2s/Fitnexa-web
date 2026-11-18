'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PublicTenant } from '@fitexaa/api-client';

/** The site this browser is on: one gym (white-label) or the Fitexaa platform console. */
export type Site = { scope: 'gym'; tenant: PublicTenant } | { scope: 'platform' };

const SiteContext = createContext<Site | null>(null);

export function SiteProvider({ site, children }: { site: Site; children: ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite(): Site {
  const s = useContext(SiteContext);
  if (!s) throw new Error('useSite outside SiteProvider');
  return s;
}
