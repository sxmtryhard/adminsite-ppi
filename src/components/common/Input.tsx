import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

const FieldShell: React.FC<FieldShellProps> = ({ id, label, error, hint, children }) => (
  <div className="w-full text-left">
    {label && (
      <label htmlFor={id} className="field-label">
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${id}-error`} className="mt-1 text-xs text-danger" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="mt-1 text-xs text-subtle">
        {hint}
      </p>
    ) : null}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <FieldShell id={inputId} label={label} error={error} hint={hint}>
        <div className="relative flex items-center">
          {icon && <span className="pointer-events-none absolute left-3 flex text-subtle">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={cn('field', icon && 'pl-9', error && 'border-danger', className)}
            {...props}
          />
        </div>
      </FieldShell>
    );
  }
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, children, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    return (
      <FieldShell id={selectId} label={label} error={error} hint={hint}>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn('field pr-8', error && 'border-danger', className)}
          {...props}
        >
          {children}
        </select>
      </FieldShell>
    );
  }
);
Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const autoId = useId();
    const areaId = id ?? autoId;
    return (
      <FieldShell id={areaId} label={label} error={error} hint={hint}>
        <textarea
          ref={ref}
          id={areaId}
          rows={3}
          className={cn('field h-auto py-2', error && 'border-danger', className)}
          {...props}
        />
      </FieldShell>
    );
  }
);
Textarea.displayName = 'Textarea';
