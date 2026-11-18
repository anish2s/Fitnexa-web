'use client';

import { use } from 'react';
import { RequirePermission } from '@/components/require-permission';
import { MemberProfile } from '@/components/members/member-profile';

export default function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="members:read">
      <MemberProfile id={id} />
    </RequirePermission>
  );
}
