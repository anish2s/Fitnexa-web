'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ImageUp, Info, Trash2 } from 'lucide-react';
import { accentFor, Badge, brandVars, Button, Card, CardBody, CardHeader, Input, normalizeHex, Segmented, Skeleton, Spinner, useToast } from '@fitexaa/ui';
import type { GymView, Theme } from '@fitexaa/api-client';
import { useAuth } from '@/lib/auth';
import { useGym } from '@/lib/queries';
import { actionMessage } from '@/lib/errors';
import { IMAGE_TYPES, imageProblem, uploadImage, UploadFailed } from '@/lib/upload';
import { GymMark } from '@/components/shell/brand';
import { FormAlert } from '@/components/form-alert';

const SWATCHES = ['#E11D48', '#F97316', '#EAB308', '#16A34A', '#0EA5E9', '#2563EB', '#7C3AED', '#DB2777', '#0F172A'];

/** How the gym's colour looks in one theme, with the same tokens the app uses. */
function Preview({ color, theme, name, logoUrl }: { color: string; theme: 'dark' | 'light'; name: string; logoUrl: string | null }) {
  const a = accentFor(color, theme);
  return (
    <div data-theme={theme} style={brandVars(color) as CSSProperties} className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4 text-fg">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold"><GymMark name={name} logoUrl={logoUrl} size={24} /> {name}</span>
        <span className="text-2xs text-subtle uppercase">{theme}</span>
      </div>
      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="text-sm">Monthly plan · <span className="font-medium text-accent-text">renews 1 Dec</span></p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm">Renew</Button>
          <Badge tone="accent">Active</Badge>
          <span className="h-1.5 w-16 rounded-full bg-accent-soft"><span className="block h-full w-2/3 rounded-full bg-accent" /></span>
        </div>
      </div>
      {a.adjusted && (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" /> Adjusted to {a.accent.toUpperCase()} here so text stays readable.
        </p>
      )}
    </div>
  );
}

function ImageSlot({ label, hint, url, square, onUpload, onRemove }: { label: string; hint: string; url: string | null; square?: boolean; onUpload: (f: File) => Promise<void>; onRemove: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote image host */}
        {url ? <img src={url} alt="" className={square ? 'size-full object-cover' : 'size-full object-contain p-1'} /> : <ImageUp className="size-5 text-subtle" />}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-overlay text-white"><Spinner className="size-4" /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>{url ? 'Replace' : 'Upload'}</Button>
          {url && <Button size="sm" variant="ghost" disabled={busy} leftIcon={<Trash2 className="size-3.5" />} onClick={() => run(onRemove)}>Remove</Button>}
        </div>
      </div>
      <input ref={input} type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => e.target.files?.[0] && run(() => onUpload(e.target.files![0]!))} />
    </div>
  );
}

/**
 * Branding form. On the gym's own site it saves with PATCH /gym/branding and re-themes the app; the
 * platform console passes `saveVia` (PATCH /platform/tenants/:id/branding) and hides uploads, which
 * only work on the gym's own host.
 */
export function BrandingForm({ gym, saveVia }: { gym: GymView; saveVia?: (body: Record<string, unknown>) => Promise<GymView> }) {
  const { api } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [color, setColor] = useState(gym.branding.primaryColor.toUpperCase());
  const [hexText, setHexText] = useState(gym.branding.primaryColor.toUpperCase());
  const [theme, setTheme] = useState<Theme>(gym.branding.defaultTheme);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const dirty = color !== gym.branding.primaryColor.toUpperCase() || theme !== gym.branding.defaultTheme;
  const hexError = normalizeHex(hexText) ? null : 'Use a hex colour like #7C3AED';

  /** Saves branding and re-renders the server layout so the whole app picks up the change. */
  async function patch(body: Record<string, unknown>, success: string) {
    if (saveVia) {
      const data = await saveVia(body);
      toast.show({ tone: 'success', title: success });
      return data;
    }
    const { data } = await api.patch('/api/v1/gym/branding', { body: body as never });
    queryClient.setQueryData(['gym'], data);
    router.refresh();
    toast.show({ tone: 'success', title: success });
    return data;
  }

  const image = (field: 'logoUrl' | 'appIconUrl', purpose: 'gym_logo' | 'gym_icon', name: string) => ({
    onUpload: async (file: File) => {
      const problem = imageProblem(file);
      if (problem) return void toast.show({ tone: 'error', title: problem });
      try {
        const { deliveryUrl } = await uploadImage(api, { purpose }, file);
        await patch({ [field]: deliveryUrl }, `${name} updated`);
      } catch (err) {
        toast.show({ tone: 'error', title: `Couldn’t update the ${name.toLowerCase()}`, description: err instanceof UploadFailed ? err.message : actionMessage(err) });
      }
    },
    onRemove: async () => {
      try {
        await patch({ [field]: null }, `${name} removed`);
      } catch (err) {
        toast.show({ tone: 'error', title: `Couldn’t remove the ${name.toLowerCase()}`, description: actionMessage(err) });
      }
    },
  });

  async function save() {
    if (hexError) return;
    setSaving(true);
    setFailure(null);
    try {
      const body: Record<string, unknown> = {};
      if (color !== gym.branding.primaryColor.toUpperCase()) body.primaryColor = color;
      if (theme !== gym.branding.defaultTheme) body.defaultTheme = theme;
      await patch(body, 'Branding saved');
    } catch (err) {
      setFailure(actionMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const pick = (hex: string) => {
    setColor(hex.toUpperCase());
    setHexText(hex.toUpperCase());
  };

  return (
    <div className="flex flex-col gap-5">
      {!saveVia && <Card>
        <CardHeader title="Logo and app icon" description="Your members see only your gym’s name, logo and colour, never ours." />
        <CardBody className="grid gap-6 sm:grid-cols-2">
          <ImageSlot label="Logo" hint="Sidebar, sign-in page and receipts. PNG with a transparent background works best." url={gym.branding.logoUrl} {...image('logoUrl', 'gym_logo', 'Logo')} />
          <ImageSlot label="App icon" hint="Square, at least 512 × 512. Used when members add the app to their home screen." url={gym.branding.appIconUrl} square {...image('appIconUrl', 'gym_icon', 'App icon')} />
        </CardBody>
      </Card>}

      <Card>
        <CardHeader title="Colour and theme" description="We keep any colour readable in both themes (WCAG AA): too-light or too-dark colours are adjusted where needed." />
        <CardBody className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-4">
            {failure && <FormAlert tone="danger" message={failure} />}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Brand colour</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Suggested colours">
                {SWATCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={color === s}
                    aria-label={s}
                    onClick={() => pick(s)}
                    className={`size-8 rounded-full border-2 ${color === s ? 'border-fg' : 'border-transparent'} ring-1 ring-border`}
                    style={{ background: s }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-end gap-3">
              <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border" title="Pick any colour">
                <input type="color" value={color} onChange={(e) => pick(e.target.value)} className="absolute -inset-2 size-14 cursor-pointer" aria-label="Pick any colour" />
              </label>
              <Input
                label="Hex"
                value={hexText}
                maxLength={7}
                onChange={(e) => {
                  setHexText(e.target.value);
                  const n = normalizeHex(e.target.value);
                  if (n) setColor(n.toUpperCase());
                }}
                error={hexError ?? undefined}
                className="font-mono uppercase"
                wrapperClassName="w-36"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Default theme</span>
              <Segmented size="md" value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'Match device' }]} className="w-fit" />
              <p className="text-xs text-subtle">What staff and members see first. Anyone can switch for themselves.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} loading={saving} disabled={!dirty || Boolean(hexError)}>Save branding</Button>
              <Button variant="secondary" disabled={!dirty || saving} onClick={() => { pick(gym.branding.primaryColor); setTheme(gym.branding.defaultTheme); }}>Reset</Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Preview color={color} theme="dark" name={gym.name} logoUrl={gym.branding.logoUrl} />
            <Preview color={color} theme="light" name={gym.name} logoUrl={gym.branding.logoUrl} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function BrandingSettings() {
  const gym = useGym();
  if (gym.isError) return <FormAlert tone="danger" message={actionMessage(gym.error)} />;
  if (!gym.data) return <div className="flex flex-col gap-4" aria-busy><Skeleton className="h-40" /><Skeleton className="h-72" /></div>;
  return <BrandingForm key={gym.data.updatedAt} gym={gym.data} />;
}
