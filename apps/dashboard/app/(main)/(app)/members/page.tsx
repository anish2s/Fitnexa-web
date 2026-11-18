'use client';

import { Suspense } from 'react';
import { RequirePermission } from '@/components/require-permission';
import { MemberList } from '@/components/members/member-list';

export default function MembersPage() {
  return (
    <RequirePermission permission="members:read">
      <Suspense>
        <MemberList />
      </Suspense>
    </RequirePermission>
  );
}
