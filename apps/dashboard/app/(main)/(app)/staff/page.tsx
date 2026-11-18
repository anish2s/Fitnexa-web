'use client';

import { RequirePermission } from '@/components/require-permission';
import { StaffList } from '@/components/staff/staff-list';

export default function StaffPage() {
  return (
    <RequirePermission permission="staff:read">
      <StaffList />
    </RequirePermission>
  );
}
