import { CloudOff, SearchX } from 'lucide-react';
import { EmptyState } from '@fitnexa/ui';

/** Shown instead of the app when the host isn't a known gym, or the API can't be reached. */
export function SiteProblem({ kind, host }: { kind: 'not_found' | 'unavailable'; host: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      {kind === 'not_found' ? (
        <EmptyState
          icon={<SearchX />}
          title="Gym not found"
          description={`There is no gym at ${host.replace(/:\d+$/, '')}. Check the address, or ask your gym for the right link.`}
        />
      ) : (
        <EmptyState
          icon={<CloudOff />}
          title="We can't reach the service right now"
          description="This is usually brief. Please refresh the page in a minute."
        />
      )}
    </main>
  );
}
