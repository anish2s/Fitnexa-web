import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@fitexaa/ui';

const tones = {
  danger: { box: 'border-danger/40 bg-danger-soft', icon: <AlertCircle className="size-4 text-danger-text" /> },
  success: { box: 'border-success/40 bg-success-soft', icon: <CheckCircle2 className="size-4 text-success-text" /> },
  info: { box: 'border-info/40 bg-info-soft', icon: <Info className="size-4 text-info-text" /> },
};

/** Inline form-level message. `reference` is the API request id, for support. */
export function FormAlert({ tone, message, reference, className }: { tone: keyof typeof tones; message: string; reference?: string; className?: string }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-lg border p-3 text-sm', tones[tone].box, className)}>
      <span className="mt-0.5 shrink-0">{tones[tone].icon}</span>
      <div className="min-w-0">
        <p className="text-fg">{message}</p>
        {reference && <p className="mt-1 text-2xs text-subtle">Reference: {reference}</p>}
      </div>
    </div>
  );
}
