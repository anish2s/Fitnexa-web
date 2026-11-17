'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, BarChart3, Building2, CreditCard, Dumbbell, ShieldCheck, Users } from 'lucide-react';

/**
 * Decorative pieces of the sign-in screens. Everything is tinted from the accent token, so a gym's
 * own colour drives the look (white-label) and the platform console gets the Fitnexa accent.
 */

/** Soft accent waves along the top-left and bottom edges of the page. */
export function AuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_15%_10%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_95%_60%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_70%)]" />
      <svg className="absolute -top-10 -left-24 h-[260px] w-[720px] opacity-80" viewBox="0 0 720 260" fill="none">
        <path d="M0 0h720c-60 40-150 70-260 60S260 40 170 110 40 240 0 260z" fill="color-mix(in oklab, var(--accent) 38%, transparent)" />
        <path d="M0 150c90-40 160-120 300-110s230 10 330-40" stroke="color-mix(in oklab, var(--accent) 55%, transparent)" strokeWidth="1.5" />
      </svg>
      <svg className="absolute -bottom-6 left-0 h-[200px] w-[110%] opacity-90" viewBox="0 0 1600 200" preserveAspectRatio="none" fill="none">
        <path d="M0 60c260 10 520 120 820 110s520-90 780-50v80H0z" fill="color-mix(in oklab, var(--accent) 26%, transparent)" />
        <path d="M0 30c300 20 560 140 860 130s480-80 740-60" stroke="color-mix(in oklab, var(--accent) 70%, transparent)" strokeWidth="2" />
        <path d="M0 95c260 0 520 90 820 85s500-70 780-40" stroke="color-mix(in oklab, var(--accent) 40%, transparent)" strokeWidth="1" />
      </svg>
    </div>
  );
}

type Feature = { icon: ReactNode; label: string };

const GYM_FEATURES: Feature[] = [
  { icon: <Users />, label: 'Manage Members' },
  { icon: <CreditCard />, label: 'Track Payments' },
  { icon: <BarChart3 />, label: 'Monitor Growth' },
];
const PLATFORM_FEATURES: Feature[] = [
  { icon: <Building2 />, label: 'Every Gym' },
  { icon: <BarChart3 />, label: 'Plans & Usage' },
  { icon: <ShieldCheck />, label: 'Secure Access' },
];

/** Left column: tagline, headline and three feature tiles. Shown on large screens only. */
export function AuthIntro({ platform }: { platform: boolean }) {
  const features = platform ? PLATFORM_FEATURES : GYM_FEATURES;
  return (
    <div className="max-w-[460px]">
      <span className="inline-flex items-center gap-2 rounded-full border border-accent-ring bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-fg">
        <Activity className="size-4 text-accent-text" />
        {platform ? 'Fitnexa platform console' : 'Your Fitness Journey Starts Here'}
      </span>
      <h2 className="mt-6 text-[clamp(32px,2.6vw,44px)] leading-[1.15] font-bold tracking-tight text-fg">
        {platform ? 'Every Gym,' : 'Stronger Today,'}
        <span className="block bg-[linear-gradient(90deg,var(--accent-text),color-mix(in_oklab,var(--accent-text)_70%,var(--text)))] bg-clip-text text-transparent">
          {platform ? 'One Console' : 'Healthier Tomorrow'}
        </span>
      </h2>
      <svg aria-hidden className="mt-3 h-3 w-64" viewBox="0 0 256 12" fill="none">
        <path d="M2 10C70 3 170 1 254 2" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="mt-5 text-md text-muted">
        {platform
          ? 'Onboard gyms, manage plans and keep an eye on the whole platform.'
          : 'Manage your members, payments and check-ins, and help everyone reach their fitness goals.'}
      </p>
      <ul className="mt-10 flex gap-8">
        {features.map((f) => (
          <li key={f.label} className="flex w-24 flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-xl border border-border bg-surface/70 text-accent-text shadow-2 [&>svg]:size-6">
              {f.icon}
            </span>
            <span className="text-sm leading-tight font-medium text-fg">{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Right column artwork. Uses /auth-hero.jpg when the file exists in apps/dashboard/public;
 * otherwise falls back to an accent-lit dumbbell so the column never looks empty.
 */
export function AuthHero() {
  const [hasPhoto, setHasPhoto] = useState(true);
  const img = useRef<HTMLImageElement>(null);
  // The image can fail before React hydrates (onError never fires), so check it after mount too.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setHasPhoto(false);
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] 2xl:block">
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- optional static asset; hidden if missing
        <img
          ref={img}
          src="/auth-hero.jpg"
          alt=""
          onError={() => setHasPhoto(false)}
          className="h-full w-full object-cover object-[30%_center] [mask-image:linear-gradient(to_right,transparent,black_35%)]"
        />
      ) : (
        <div className="relative flex h-full items-center justify-center">
          <div className="absolute size-[420px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_40%,transparent),transparent_65%)] blur-2xl" />
          <Dumbbell className="relative size-72 -rotate-12 text-accent-text opacity-25" strokeWidth={1} />
        </div>
      )}
    </div>
  );
}
