'use client';

import { useState, type ReactNode } from 'react';
import { Button, Modal } from '@fitnexa/ui';
import { actionMessage, errorRef } from '@/lib/errors';
import { FormAlert } from './form-alert';

/** Confirmation for a consequential action. Shows the API error in place if it fails. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  tone = 'primary',
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Return false to keep the dialog open (e.g. a field in it is invalid). */
  onConfirm: () => Promise<void | boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ message: string; ref?: string } | null>(null);

  const close = () => {
    if (busy) return;
    setFailure(null);
    onClose();
  };

  async function confirm() {
    setBusy(true);
    setFailure(null);
    try {
      if ((await onConfirm()) !== false) onClose();
    } catch (err) {
      setFailure({ message: actionMessage(err), ref: errorRef(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={confirm} loading={busy}>{confirmLabel}</Button>
        </>
      }
    >
      {(children || failure) && (
        <div className="flex flex-col gap-3 text-sm text-muted">
          {children}
          {failure && <FormAlert tone="danger" message={failure.message} reference={failure.ref} />}
        </div>
      )}
    </Modal>
  );
}
