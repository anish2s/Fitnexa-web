'use client';

import { Suspense } from 'react';
import { RequirePermission } from '@/components/require-permission';
import { FrontDesk } from '@/components/front-desk/front-desk';

export default function Page() {
  return (
    <RequirePermission permission="attendance:checkin">
      <Suspense>
        <FrontDesk />
      </Suspense>
    </RequirePermission>
  );
}
