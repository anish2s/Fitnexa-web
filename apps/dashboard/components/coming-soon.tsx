import { Hammer } from 'lucide-react';
import { Card, EmptyState } from '@fitnexa/ui';
import { PageHeader } from './page-header';

/** Placeholder for screens planned in a later milestone (so the menu never leads to a 404). */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={<Hammer />} title="Not built yet" description={note} />
      </Card>
    </div>
  );
}
