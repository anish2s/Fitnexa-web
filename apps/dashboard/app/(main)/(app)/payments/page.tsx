'use client';

import { Suspense } from 'react';
import { RequirePermission } from '@/components/require-permission';
import { PaymentList } from '@/components/payments/payment-list';

export default function Page() {
  return (
    <RequirePermission permission="payments:read">
      <Suspense>
        <PaymentList />
      </Suspense>
    </RequirePermission>
  );
}
