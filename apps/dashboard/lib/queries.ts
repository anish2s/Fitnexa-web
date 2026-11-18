'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth';

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
    retry: (n, err) => (err as { status?: number }).status !== 404 && n < 2,
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
