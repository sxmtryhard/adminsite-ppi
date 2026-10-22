import React from 'react';
import { AlertCircle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Alert: React.FC<{
  tone?: 'error' | 'success' | 'info' | 'warning';
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'error', children, className }) => {
  const styles = {
    error: 'bg-danger/10 border-danger/25 text-danger',
    success: 'bg-success/10 border-success/25 text-success',
    info: 'bg-info/10 border-info/25 text-info',
    warning: 'bg-warning/10 border-warning/25 text-warning',
  };
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertCircle;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm', styles[tone], className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
    <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-subtle">
      <Icon className="h-5 w-5" aria-hidden />
    </div>
    <p className="text-sm font-medium text-ink">{title}</p>
    {description && <p className="max-w-sm text-xs text-muted">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Cargando…' }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
    {label}
  </div>
);

export const FullScreenLoader: React.FC<{ label?: string }> = ({ label = 'Verificando sesión…' }) => (
  <div className="flex h-screen w-full items-center justify-center bg-bg">
    <Spinner label={label} />
  </div>
);

export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-2 p-4" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton h-10 w-full" />
    ))}
  </div>
);
