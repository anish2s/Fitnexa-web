'use client';

import { Suspense } from 'react';
import { useSite } from '@/lib/site';
import { RequirePermission } from '@/components/require-permission';
import { RequirePlatform } from '@/components/platform/require-platform';
import { AuditLog } from '@/components/audit/audit-log';

export default function AuditLogPage() {
  if (useSite().scope === 'platform') {
    return (
      <RequirePlatform>
        <Suspense>
          <AuditLog source={{ kind: 'platform' }} />
        </Suspense>
      </RequirePlatform>
    );
  }
  return (
    <RequirePermission permission="audit:read">
      <Suspense>
        <AuditLog />
      </Suspense>
    </RequirePermission>
  );
}
