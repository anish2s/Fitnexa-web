'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff, SwitchCamera } from 'lucide-react';
import { Button, Modal, Spinner } from '@fitnexa/ui';

type ScannerInstance = { start(): Promise<void>; stop(): void; destroy(): void; setCamera(id: string): Promise<void> };

/**
 * Camera QR scanner in a dialog. Uses the browser's built-in barcode detector where available and a
 * small decoder in a web worker otherwise (qr-scanner). Closes itself on the first code it reads.
 */
export function QrCameraDialog({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<ScannerInstance | null>(null);
  const [state, setState] = useState<'starting' | 'running' | 'error'>('starting');
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let done = false;
    (async () => {
      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled || !video.current) return;
        if (!(await QrScanner.hasCamera())) throw new Error('no-camera');
        const s = new QrScanner(
          video.current,
          (result) => {
            if (done) return;
            done = true;
            s.stop();
            onCode(result.data);
          },
          { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true, maxScansPerSecond: 8 },
        );
        scanner.current = s;
        await s.start();
        if (cancelled) return s.destroy();
        setState('running');
        setCameras(await QrScanner.listCameras(true));
      } catch (err) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name ?? String(err);
        setError(
          /NotAllowed|Permission|denied/i.test(name)
            ? 'Camera access was blocked. Allow the camera for this site in the browser’s address bar, then try again.'
            : /no-camera|NotFound|Camera not found/i.test(String(err))
              ? 'No camera found on this device. Use a USB scanner or search by name instead.'
              : 'The camera couldn’t start. Close other apps using it and try again.',
        );
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
      scanner.current?.destroy();
      scanner.current = null;
      setState('starting'); // ready for the next time the dialog opens
    };
  }, [open, onCode]);

  async function switchCamera() {
    if (!scanner.current || cameras.length < 2) return;
    const next = (cameraIndex + 1) % cameras.length;
    setCameraIndex(next);
    await scanner.current.setCamera(cameras[next]!.id);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan member pass"
      description="Hold the QR code from the member app inside the frame."
      footer={
        <>
          {cameras.length > 1 && state === 'running' && (
            <Button variant="secondary" leftIcon={<SwitchCamera className="size-4" />} onClick={switchCamera} className="sm:mr-auto">Switch camera</Button>
          )}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-black">
        <video ref={video} className="size-full object-cover" muted playsInline />
        {state === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80"><Spinner className="size-5" /> Starting camera…</div>
        )}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface p-6 text-center text-sm text-muted">
            <CameraOff className="size-6" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
