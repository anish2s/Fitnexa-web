'use client';

import { RequirePermission } from '@/components/require-permission';
import { MemberImport } from '@/components/members/member-import';

export default function ImportMembersPage() {
  return (
    <RequirePermission permission="members:import">
      <MemberImport />
    </RequirePermission>
  );
}
