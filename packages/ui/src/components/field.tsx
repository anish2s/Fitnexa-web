import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../cn';

const control =
  'w-full h-9 rounded-md border bg-surface text-base text-fg placeholder:text-subtle ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-border-strong focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-soft ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-2';

interface FieldShellProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ id, label, hint, error, required, children, className }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
          {required && <span className="ml-0.5 text-danger-text" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger-text">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, className, wrapperClassName, id, required, ...props },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle [&>svg]:size-4">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            control,
            'px-3',
            leftIcon && 'pl-9',
            rightSlot && 'pr-16',
            error ? 'border-danger focus:border-danger focus:ring-danger-soft' : 'border-border',
            className,
          )}
          {...props}
        />
        {rightSlot && <span className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</span>}
      </div>
    </FieldShell>
  );
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
}

/** Native <select>: accessible, keyboard- and mobile-friendly; styled to match Input. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, className, wrapperClassName, id, required, ...props },
  ref,
) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <FieldShell id={selectId} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(
            control,
            'appearance-none pl-3 pr-9',
            error ? 'border-danger' : 'border-border',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      </div>
    </FieldShell>
  );
});

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border bg-surface-2 px-1 font-sans text-2xs font-medium text-subtle', className)}>
      {children}
    </kbd>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, id, required, rows = 3, ...props },
  ref,
) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(control, 'h-auto resize-y px-3 py-2', error ? 'border-danger focus:border-danger focus:ring-danger-soft' : 'border-border', className)}
        {...props}
      />
    </FieldShell>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

/** Native checkbox with a label (and optional description) that is part of the click target. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, error, className, wrapperClassName, id, ...props },
  ref,
) {
  const auto = useId();
  const boxId = id ?? auto;
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      <label htmlFor={boxId} className="flex cursor-pointer items-start gap-3">
        <input
          ref={ref}
          id={boxId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${boxId}-error` : undefined}
          className={cn('mt-0.5 size-4 shrink-0 cursor-pointer rounded-xs border-border accent-[var(--accent)]', className)}
          {...props}
        />
        <span className="min-w-0 text-sm">
          <span className="font-medium text-fg">{label}</span>
          {description && <span className="mt-0.5 block text-muted">{description}</span>}
        </span>
      </label>
      {error && <p id={`${boxId}-error`} className="pl-7 text-xs text-danger-text">{error}</p>}
    </div>
  );
});
