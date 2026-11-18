'use client';

import { RequirePlatform } from '@/components/platform/require-platform';
import { CreateGym } from '@/components/platform/create-gym';

export default function NewGymPage() {
  return (
    <RequirePlatform>
      <CreateGym />
    </RequirePlatform>
  );
}
