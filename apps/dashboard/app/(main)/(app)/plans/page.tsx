'use client';

import { RequirePermission } from '@/components/require-permission';
import { PlanList } from '@/components/plans/plan-list';

export default function PlansPage() {
  return (
    <RequirePermission permission="plans:read">
      <PlanList />
    </RequirePermission>
  );
}
