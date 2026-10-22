import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'danger' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'default',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]';

  const variants = {
    default:
      'bg-gradient-to-br from-accent to-accent-strong text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:brightness-110',
    ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
    outline: 'border border-line bg-transparent text-ink hover:bg-surface-2',
    subtle: 'bg-surface-2 text-ink hover:bg-line',
    danger: 'bg-danger/90 text-white hover:bg-danger',
  };

  const sizes = {
    sm: 'h-8 px-3.5 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-6 text-sm',
    icon: 'h-9 w-9',
  };

  return (
    <button
      type={type}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {children}
    </button>
  );
};
