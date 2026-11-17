import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, { box: string; dot: string }> = {
  neutral: { box: 'bg-neutral-soft text-muted', dot: 'bg-subtle' },
  accent: { box: 'bg-accent-soft text-accent-text', dot: 'bg-accent' },
  success: { box: 'bg-success-soft text-success-text', dot: 'bg-success' },
  warning: { box: 'bg-warning-soft text-warning-text', dot: 'bg-warning' },
  danger: { box: 'bg-danger-soft text-danger-text', dot: 'bg-danger' },
  info: { box: 'bg-info-soft text-info-text', dot: 'bg-info' },
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({ tone = 'neutral', dot, size = 'sm', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'h-5 px-2 text-2xs' : 'h-6 px-2.5 text-xs',
        tones[tone].box,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('size-1.5 rounded-full', tones[tone].dot)} aria-hidden />}
      {children}
    </span>
  );
}

/** Trend chip for KPI cards: ▲ 12.4% (green) / ▼ 3.1% (red). `invert` when "down" is good. */
export function TrendChip({ value, invert, className }: { value: number; invert?: boolean; className?: string }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-2xs font-semibold tabular-nums',
        value === 0 ? 'bg-neutral-soft text-muted' : good ? 'bg-success-soft text-success-text' : 'bg-danger-soft text-danger-text',
        className,
      )}
    >
      <span aria-hidden>{value === 0 ? '–' : up ? '▲' : '▼'}</span>
      <span className="sr-only">{up ? 'up' : 'down'}</span>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
