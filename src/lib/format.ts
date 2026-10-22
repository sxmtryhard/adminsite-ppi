import { BUSINESS_TIMEZONE } from '@/domain/time';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const formatCOP = (value: number): string => cop.format(Math.round(value));

export const formatPct = (value: number | null, digits = 1): string =>
  value === null ? '—' : `${value.toFixed(digits).replace('.', ',')} %`;

export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(iso));

export const formatShortDate = (date: string): string =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
