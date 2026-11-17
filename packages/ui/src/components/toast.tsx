'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../cn';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

const icons = {
  success: <CheckCircle2 className="size-4 text-success-text" />,
  error: <XCircle className="size-4 text-danger-text" />,
  warning: <AlertTriangle className="size-4 text-warning-text" />,
  info: <Info className="size-4 text-info-text" />,
};

const bars: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
};

export function ToastView({ toast, onDismiss, className }: { toast: Omit<ToastData, 'id'>; onDismiss?: () => void; className?: string }) {
  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'relative flex w-full items-start gap-3 overflow-hidden rounded-lg border border-border bg-surface py-3 pr-3 pl-4 shadow-3 sm:w-[360px]',
        className,
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', bars[toast.tone])} aria-hidden />
      <span className="mt-0.5 shrink-0">{icons[toast.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-fg">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
        {toast.action && (
          <button onClick={toast.action.onClick} className="mt-2 text-sm font-medium text-accent-text hover:underline">
            {toast.action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="rounded-sm p-0.5 text-subtle hover:text-fg">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

interface ToastApi {
  show: (t: Omit<ToastData, 'id'>, ms?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastData[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi['show']>(
    (t, ms = 5000) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-3), { ...t, id }]);
      if (ms > 0) setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full animate-enter sm:w-auto">
            <ToastView toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
