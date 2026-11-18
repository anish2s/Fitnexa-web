'use client';

import { Suspense, use } from 'react';
import { RequirePlatform } from '@/components/platform/require-platform';
import { GymDetail } from '@/components/platform/gym-detail';

export default function GymPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePlatform>
      <Suspense>
        <GymDetail id={id} />
      </Suspense>
    </RequirePlatform>
  );
}
