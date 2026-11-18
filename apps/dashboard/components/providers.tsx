'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@fitnexa/ui';
import { AuthProvider } from '@/lib/auth';
import { SiteProvider, type Site } from '@/lib/site';
import { retryDelay, shouldRetry } from '@/lib/retry';

export function Providers({ site, hasSession, children }: { site: Site; hasSession: boolean; children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // Only 5xx/network failures, briefly: see lib/retry.ts.
            retry: shouldRetry,
            retryDelay,
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
