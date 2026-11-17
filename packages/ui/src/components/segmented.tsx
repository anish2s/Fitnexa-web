'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '../cn';

/** Segmented control for switching views (e.g. 7d / 30d / 12m). */
export function Segmented<T extends string>({
  value: controlled,
  options,
  onChange,
  className,
  size = 'sm',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange?: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [inner, setInner] = useState(controlled);
  const value = onChange ? controlled : inner;
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-lg border border-border bg-surface-2 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => (onChange ? onChange(o.value) : setInner(o.value))}
            className={cn(
              'rounded-md px-2.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring',
              size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm',
              active ? 'bg-surface text-fg shadow-1' : 'text-subtle hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

