'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@fitnexa/api-client';
import { ToastProvider } from '@fitnexa/ui';
import { AuthProvider } from '@/lib/auth';
import { SiteProvider, type Site } from '@/lib/site';

export function Providers({ site, hasSession, children }: { site: Site; hasSession: boolean; children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // Retry only transient failures; a 4xx won't change by asking again.
            retry: (count, err) => count < 2 && (!(err instanceof ApiError) || err.status === 0 || err.status >= 500),
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <SiteProvider site={site}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider hasSession={hasSession}>{children}</AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SiteProvider>
  );
}
