'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../cn';
import { Button } from './button';

export interface ModalPanelProps {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  titleId?: string;
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

/** The visual panel of a modal; used by <Modal> and directly in the design preview. */
export function ModalPanel({ title, description, children, footer, onClose, size = 'md', className, titleId }: ModalPanelProps) {
  return (
    <div className={cn('w-full rounded-xl border border-border bg-surface shadow-3', widths[size], className)}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-fg">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1">
            <X className="size-4" />
          </Button>
        )}
      </div>
      {children && <div className="px-5 py-4">{children}</div>}
      {footer && <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
    </div>
  );
}

export interface ModalProps extends Omit<ModalPanelProps, 'onClose' | 'titleId'> {
  open: boolean;
  onClose: () => void;
}

/**
 * Accessible modal on the native <dialog>: focus trap, Esc to close, inert background, top layer.
 * On phones it docks to the bottom as a sheet.
 */
export function Modal({ open, onClose, ...panel }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'm-0 max-h-none max-w-none bg-transparent p-0 text-fg backdrop:bg-overlay backdrop:backdrop-blur-[2px]',
        'fixed inset-x-0 bottom-0 top-auto w-full sm:inset-0 sm:m-auto sm:h-fit sm:w-[calc(100%-2rem)]',
        'open:flex open:justify-center open:animate-enter',
        panel.size === 'lg' ? 'sm:max-w-2xl' : panel.size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg',
      )}
    >
      <ModalPanel {...panel} titleId={titleId} onClose={onClose} className="max-sm:max-w-none max-sm:rounded-b-none" />
    </dialog>
  );
}
