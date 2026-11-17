import { FlaskConical } from 'lucide-react';

/** Marks mock-up content as made-up sample data. */
export function SampleTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2 py-0.5 text-2xs font-medium text-subtle">
      <FlaskConical className="size-3" aria-hidden />
      Sample data
    </span>
  );
}
