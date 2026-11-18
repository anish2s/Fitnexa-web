'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth';
import { retryDelay, shouldRetry } from './retry';

/*
 * Retries for every query here and in the app default (components/providers.tsx) follow
 * lib/retry.ts: never on 4xx, at most twice on 5xx/network errors, done within about a second.
 */

/** GET /dashboard: KPIs for the overview and the Renewals nav badge (shared cache entry). */
export function useDashboard() {
  const { api, can } = useAuth();
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/v1/dashboard').then((r) => r.data),
    enabled: can('dashboard:read'),
  });
}

/** GET /members/:id — shared by the profile and edit screens. */
export function useMember(id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => api.get('/api/v1/members/{id}', { params: { id } }).then((r) => r.data),
    // Explicit, though it is also the app default: a 404 shows "Member not found" at once.
    retry: shouldRetry,
    retryDelay,
  });
}

/** GET /gym — read for settings that change what forms offer (e.g. GSTIN for plan tax). */
export function useGym() {
  const { api, can } = useAuth();
  return useQuery({
    queryKey: ['gym'],
    queryFn: () => api.get('/api/v1/gym').then((r) => r.data),
    enabled: can('gym:read'),
    staleTime: 5 * 60_000,
  });
}
