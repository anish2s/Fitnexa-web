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
