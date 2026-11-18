'use client';

import { Suspense } from 'react';
import { RequirePermission } from '@/components/require-permission';
import { Reports } from '@/components/reports/reports';

export default function ReportsPage() {
  return (
    <RequirePermission permission="reports:read">
      <Suspense>
        <Reports />
      </Suspense>
    </RequirePermission>
  );
}
