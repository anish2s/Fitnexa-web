'use client';

import { Suspense } from 'react';
import { Settings } from '@/components/settings/settings';

/** Everyone has a Settings page (at least "My account"); tabs inside follow permissions. */
export default function SettingsPage() {
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}
