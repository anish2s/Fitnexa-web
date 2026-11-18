'use client';

import { Suspense } from 'react';
import { useSite } from '@/lib/site';
import { RequirePermission } from '@/components/require-permission';
import { AuditLog } from '@/components/audit/audit-log';
import { ComingSoon } from '@/components/coming-soon';

export default function AuditLogPage() {
  // The platform's own audit log is Milestone 5.
  if (useSite().scope === 'platform') return <ComingSoon title="Audit log" note="The platform audit log is planned for Milestone 5." />;
  return (
    <RequirePermission permission="audit:read">
      <Suspense>
        <AuditLog />
      </Suspense>
    </RequirePermission>
  );
}
