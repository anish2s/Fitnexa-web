'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@fitexaa/ui';
import { ICON_MAX_BYTES } from '@/lib/upload';

/** Largest side of the cropped icon (the API serves icons at up to 512 px). */
const OUT_MAX = 1024;

const blobOf = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('crop failed'))), type, quality));

/**
 * Crops an image to a square: zoom in and slide along the longer side. Produces a PNG (or WebP if a
 * PNG would be over 2 MB), so the result always meets the app icon rules.
 */
export function SquareCropDialog({ file, onCancel, onCropped }: { file: File | null; onCancel: () => void; onCropped: (f: File) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState(0.5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return;
    let done = false;
    let bmp: ImageBitmap | null = null;
    void createImageBitmap(file).then((b) => {
      bmp = b;
      if (done) b.close();
      else {
        setImg(b);
        setZoom(1);
        setPos(0.5);
      }
    });
    return () => {
      done = true;
      bmp?.close();
      setImg(null);
    };
  }, [file]);

  /** The square of the source image being kept, in source pixels. */
  const region = (b: ImageBitmap) => {
    const side = Math.min(b.width, b.height) / zoom;
    const x = (b.width - side) * (b.width >= b.height ? pos : 0.5);
    const y = (b.height - side) * (b.height > b.width ? pos : 0.5);
    return { x, y, side };
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const r = region(img);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, r.x, r.y, r.side, r.side, 0, 0, c.width, c.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- region reads zoom/pos, listed here
  }, [img, zoom, pos]);

  async function crop() {
    if (!img) return;
    setBusy(true);
    try {
      const r = region(img);
      const out = document.createElement('canvas');
      out.width = out.height = Math.round(Math.min(OUT_MAX, r.side));
      out.getContext('2d')!.drawImage(img, r.x, r.y, r.side, r.side, 0, 0, out.width, out.height);
      let blob = await blobOf(out, 'image/png');
      let name = file!.name.replace(/\.[^.]+$/, '') + '.png';
      if (blob.size > ICON_MAX_BYTES) {
        blob = await blobOf(out, 'image/webp', 0.9);
        name = name.replace(/\.png$/, '.webp');
      }
      onCropped(new File([blob], name, { type: blob.type }));
    } finally {
      setBusy(false);
    }
  }

  const landscape = img ? img.width >= img.height : true;
  return (
    <Modal
      open={file !== null}
      onClose={onCancel}
      title="Crop to a square"
      description="App icons are square. Choose the part to keep."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button onClick={crop} loading={busy} disabled={!img}>Use this</Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <canvas ref={canvas} width={240} height={240} className="size-60 rounded-2xl border border-border bg-surface-2" aria-label="Cropped preview" />
        <label className="flex w-full flex-col gap-1 text-sm">
          <span className="font-medium">Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="accent-[var(--accent)]" aria-label="Zoom" />
        </label>
        <label className="flex w-full flex-col gap-1 text-sm">
          <span className="font-medium">{landscape ? 'Left ↔ right' : 'Top ↕ bottom'}</span>
          <input type="range" min={0} max={1} step={0.01} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="accent-[var(--accent)]" aria-label="Position" />
        </label>
      </div>
    </Modal>
  );
}
