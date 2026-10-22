import React from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
    </div>
    {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, actions, className, bodyClassName, children }) => (
  <section className={cn('card', className)}>
    {(title || actions) && (
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-start gap-2.5">
          {Icon && <Icon className="mt-0.5 h-4 w-4 text-muted" aria-hidden />}
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
    )}
    <div className={cn('p-5', bodyClassName)}>{children}</div>
  </section>
);

export const StatCard: React.FC<{
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  /** Variación porcentual frente al periodo anterior. */
  change?: number | null;
  /** Si una variación positiva es buena (ingresos) o mala (costos). */
  positiveIsGood?: boolean;
  warning?: string;
  loading?: boolean;
}> = ({ label, value, icon: Icon, hint, change, positiveIsGood = true, warning, loading }) => {
  const good = change !== undefined && change !== null && (change >= 0) === positiveIsGood;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs font-medium">{label}</span>
        {Icon && <Icon className="h-4 w-4" aria-hidden />}
      </div>
      {loading ? (
        <div className="skeleton mt-2 h-7 w-28" />
      ) : (
        <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{value}</p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        {change !== undefined && !loading && (
          change === null ? (
            <span className="text-subtle">Sin base de comparación</span>
          ) : (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', good ? 'text-success' : 'text-danger')}>
              {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change).toFixed(1).replace('.', ',')} %
            </span>
          )
        )}
        {hint && <span className="text-subtle">{hint}</span>}
      </div>
      {warning && !loading && <p className="mt-1.5 text-[11px] text-warning">{warning}</p>}
    </div>
  );
};

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.value ? 'bg-accent text-white' : 'text-muted hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
