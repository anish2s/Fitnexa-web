'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button, useToast } from '@fitnexa/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';

/**
 * Permanent while a platform admin is signed in as this gym's owner ("log in as owner").
 * The API requires the dashboard to show it whenever /auth/me has impersonatedBy.
 */
export function SupportSessionBanner({ adminName, gymName }: { adminName: string; gymName: string }) {
  const { endSupportSession } = useAuth();
  const toast = useToast();
  const [ending, setEnding] = useState(false);

  async function end() {
    setEnding(true);
    try {
      await endSupportSession();
    } catch (err) {
      toast.show({ tone: 'error', title: 'Couldn’t end the session', description: errorMessage(err) });
      setEnding(false);
    }
  }

  return (
    <div role="status" className="flex flex-col gap-3 border-b border-warning/40 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
      <ShieldAlert className="size-5 shrink-0 text-warning-text" />
      <p className="flex-1 text-sm">
        <span className="font-semibold">Support session.</span> {adminName} is signed in as the owner of {gymName}. Every action is
        recorded in the gym’s audit log.
      </p>
      <Button size="sm" variant="secondary" loading={ending} onClick={end}>End session</Button>
    </div>
  );
}
