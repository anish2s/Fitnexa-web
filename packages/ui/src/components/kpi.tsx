import { useId, type ReactNode } from 'react';
import { cn } from '../cn';
import { Card } from './card';
import { TrendChip } from './badge';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** CSS colour; defaults to the gym accent. */
  color?: string;
  fill?: boolean;
  className?: string;
  label?: string;
}

/** Tiny SVG line chart. Scales to its container width (viewBox), no chart library. */
export function Sparkline({ data, width = 120, height = 36, color = 'var(--accent)', fill = true, className, label }: SparklineProps) {
  const gid = useId().replace(/:/g, '');
  if (data.length < 2) return <svg width={width} height={height} className={className} aria-hidden />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('block h-9 w-full overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** % change vs previous period. */
  trend?: number;
  trendInvert?: boolean;
  caption?: ReactNode;
  icon?: ReactNode;
  spark?: number[];
  sparkColor?: string;
  className?: string;
}

export function KpiCard({ label, value, trend, trendInvert, caption, icon, spark, sparkColor, className }: KpiCardProps) {
  return (
    <Card className={cn('flex min-w-0 flex-col gap-2 p-4', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted [&>svg]:size-4">
            {icon}
          </span>
        )}
        <span className="truncate text-sm font-medium text-muted">{label}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="truncate text-xl font-semibold tracking-tight text-fg tabular-nums sm:text-2xl">{value}</span>
        {trend !== undefined && <TrendChip value={trend} invert={trendInvert} />}
      </div>
      {caption && <div className="-mt-1 truncate text-xs text-subtle">{caption}</div>}
      {spark && <Sparkline data={spark} color={sparkColor} className="mt-auto h-8 pt-1" />}
    </Card>
  );
}

/**
 * Area chart for a series (e.g. revenue by month). SVG scales to the container; labels are HTML
 * so text never stretches. Last point is emphasised.
 */
export function AreaChart({
  data,
  height = 220,
  format = (n) => String(n),
  className,
  label,
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (n: number) => string;
  className?: string;
  label?: string;
}) {
  const gid = useId().replace(/:/g, '');
  const W = 600;
  const H = 200;
  const max = niceStep(Math.max(...data.map((d) => d.value), 1) / 4) * 4;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  const pts = data.map((d, i) => [(i / Math.max(1, data.length - 1)) * W, H - (d.value / max) * H] as const);
  const line = smoothPath(pts);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = pts[pts.length - 1]!;
  return (
    <div className={cn('flex gap-3', className)} role="img" aria-label={label}>
      <div className="flex flex-col justify-between pb-6 text-right text-2xs text-subtle tabular-nums" style={{ height }}>
        {[...ticks].reverse().map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{format(t)}</span>)}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="relative" style={{ height: height - 24 }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <span
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent shadow-glow"
            style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex justify-between text-2xs text-subtle">
          {data.map((d, i) => (
            <span key={d.label} className={cn(i === data.length - 1 && 'font-medium text-fg', data.length > 8 && (data.length - 1 - i) % 2 === 1 && 'max-sm:invisible')}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Round step (1, 2, 2.5, 5 × 10^n) at or above v, so axis ticks read cleanly. */
function niceStep(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function smoothPath(pts: readonly (readonly [number, number])[]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

/** Simple vertical bars (e.g. check-ins per day), the highlighted bar uses the accent. */
export function MiniBars({
  data,
  highlight,
  className,
  height = 140,
}: {
  data: { label: string; value: number }[];
  highlight?: number;
  className?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn('flex items-end gap-2', className)} style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className={cn('text-2xs tabular-nums', i === highlight ? 'font-semibold text-fg' : 'text-subtle')}>{d.value}</span>
          <div
            className={cn('w-full max-w-10 rounded-md', i === highlight ? 'bg-accent shadow-glow' : 'bg-surface-3')}
            style={{ height: `${Math.max(4, (d.value / max) * (height - 44))}px` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className={cn('text-2xs', i === highlight ? 'font-medium text-fg' : 'text-subtle')}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
