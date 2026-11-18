import { Dumbbell } from 'lucide-react';

/** Gym logo: the uploaded logo if there is one, otherwise a neutral mark in the gym's colour. */
export function GymMark({ name, logoUrl, size = 32 }: { name: string; logoUrl?: string | null; size?: number }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- remote gym logo (Cloudinary), any host
    return <img src={logoUrl} alt="" width={size} height={size} className="shrink-0 rounded-lg object-contain" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent shadow-1" style={{ width: size, height: size }} aria-hidden>
      <Dumbbell style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.25} />
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function GymBrand({ name, logoUrl, size = 32 }: { name: string; logoUrl?: string | null; size?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <GymMark name={name} logoUrl={logoUrl} size={size} />
      <span className="truncate text-md font-semibold tracking-tight text-fg">{name}</span>
    </span>
  );
}

export function FitexaaGlyph({ size = 32 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent shadow-1" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 24 24" style={{ width: size * 0.56, height: size * 0.56 }} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 20V4h11" />
        <path d="M6 12h8" />
        <path d="M14 16l5 5" opacity="0.6" />
      </svg>
    </span>
  );
}

/** Fitexaa wordmark: platform (super admin) side only. */
export function FitexaaBrand({ subtitle = 'Platform console', size = 32 }: { subtitle?: string | null; size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <FitexaaGlyph size={size} />
      <span className="leading-tight">
        <span className="block text-md font-semibold tracking-tight text-fg">Fitexaa</span>
        {subtitle && <span className="block text-2xs text-subtle">{subtitle}</span>}
      </span>
    </span>
  );
}
