import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-shimmer bg-[linear-gradient(90deg,var(--surface-2)_0%,var(--surface-3)_50%,var(--surface-2)_100%)] bg-[length:200%_100%]',
        !/\brounded-/.test(className ?? '') && 'rounded-md',
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted [&>svg]:size-5">
          {icon}
        </div>
      )}
      <h3 className="text-md font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Initials avatar (or photo). Neutral by default so member lists don't turn into a rainbow. */
export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-3 font-medium text-muted', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <span aria-hidden>{initials}</span>}
      <span className="sr-only">{name}</span>
    </span>
  );
}

/**
 * Segmented quick-action pill (Synaptix accent): one rounded group of related primary actions.
 * Items are buttons/links rendered by the caller.
 */
export function ActionPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center overflow-x-auto rounded-full border border-border bg-surface p-1 shadow-1 [scrollbar-width:none]',
        '[&>*]:rounded-full [&>*+*]:ml-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ActionPillItem({
  icon,
  children,
  primary,
  className,
  as: As = 'button',
  href,
  ...props
}: HTMLAttributes<HTMLElement> & { icon?: ReactNode; primary?: boolean; as?: ElementType; href?: string }) {
  return (
    <As
      {...(As === 'button' ? { type: 'button' } : { href })}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring',
        '[&>svg]:size-4',
        primary ? 'bg-accent text-on-accent hover:brightness-110' : 'text-muted hover:bg-surface-2 hover:text-fg',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </As>
  );
}

/** Sidebar nav item. Active = accent text + soft fill + soft glow (Synaptix accent). */
export function NavItem({
  icon,
  label,
  active,
  badge,
  href = '#',
  className,
  as: Link = 'a',
  onClick,
}: {
  icon?: ReactNode;
  label: ReactNode;
  active?: boolean;
  badge?: ReactNode;
  href?: string;
  className?: string;
  /** Link component, e.g. next/link. */
  as?: ElementType;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-base font-medium transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
        active ? 'bg-accent-soft text-accent-text shadow-glow' : 'text-muted hover:bg-surface-2 hover:text-fg',
        className,
      )}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {badge}
    </Link>
  );
}

export function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-2.5 pt-4 pb-1.5 text-2xs font-semibold tracking-wider text-subtle uppercase">{label}</p>
      {children}
    </div>
  );
}
