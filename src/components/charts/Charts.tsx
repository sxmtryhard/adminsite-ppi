import React from 'react';
import { formatCOP, formatShortDate } from '@/lib/format';

/** Lista de barras horizontales con valores (ranking). Accesible como lista. */
export const BarList: React.FC<{
  items: { key: string; label: string; value: number; display: string; sub?: string }[];
  emptyText: string;
}> = ({ items, emptyText }) => {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-ink">{item.display}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-500"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
          {item.sub && <p className="mt-0.5 text-xs text-subtle">{item.sub}</p>}
        </li>
      ))}
    </ul>
  );
};

interface Series {
  label: string;
  color: string;
  values: number[];
}

/**
 * Gráfico de líneas en SVG para series diarias (ingresos frente a costos).
 * Incluye una tabla oculta visualmente para lectores de pantalla.
 */
export const TrendChart: React.FC<{ dates: string[]; series: Series[]; height?: number }> = ({
  dates,
  series,
  height = 220,
}) => {
  const width = 640;
  const pad = { top: 12, right: 12, bottom: 24, left: 12 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i: number) => pad.left + (dates.length <= 1 ? innerW / 2 : (i / (dates.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const labelEvery = Math.max(1, Math.ceil(dates.length / 6));

  return (
    <figure>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
        <span className="ml-auto text-subtle">Máx. {formatCOP(max)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Evolución diaria">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + innerH - f * innerH}
            y2={pad.top + innerH - f * innerH}
            stroke="rgb(var(--line))"
            strokeDasharray="3 4"
          />
        ))}
        {series.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          />
        ))}
        {dates.map((d, i) =>
          i % labelEvery === 0 || i === dates.length - 1 ? (
            <text key={d} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="rgb(var(--subtle))">
              {formatShortDate(d)}
            </text>
          ) : null
        )}
      </svg>
      <table className="sr-only">
        <caption>Valores diarios</caption>
        <thead>
          <tr>
            <th>Fecha</th>
            {series.map((s) => (
              <th key={s.label}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((d, i) => (
            <tr key={d}>
              <td>{d}</td>
              {series.map((s) => (
                <td key={s.label}>{formatCOP(s.values[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};
