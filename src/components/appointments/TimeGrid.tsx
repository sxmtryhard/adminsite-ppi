import React from 'react';
import { cn } from '@/lib/utils';

/** Selector de horas disponibles (grupo de opciones navegable por teclado). */
export const TimeGrid: React.FC<{
  times: string[];
  value: string;
  onChange: (time: string) => void;
  label: string;
}> = ({ times, value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
    {times.map((t) => (
      <button
        key={t}
        type="button"
        role="radio"
        aria-checked={value === t}
        onClick={() => onChange(t)}
        className={cn(
          'h-10 rounded-xl border text-sm font-medium tabular-nums transition-all',
          value === t
            ? 'border-accent bg-accent text-white shadow-[0_4px_14px_rgba(79,70,229,0.35)]'
            : 'border-line bg-surface-2 text-ink hover:border-accent/60'
        )}
      >
        {t}
      </button>
    ))}
  </div>
);
