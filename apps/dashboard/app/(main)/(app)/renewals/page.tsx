'use client';

import { Suspense } from 'react';
import { RequirePermission } from '@/components/require-permission';
import { Renewals } from '@/components/renewals/renewals';

export default function Page() {
  return (
    <RequirePermission permission="memberships:read">
      <Suspense>
        <Renewals />
      </Suspense>
    </RequirePermission>
  );
}
