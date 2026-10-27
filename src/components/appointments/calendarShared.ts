import type { AppointmentStatus } from '@/types/appointment.types';

export const START_HOUR = 7;
export const END_HOUR = 21;
export const HOUR_PX = 56;

export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: 'border-warning/60 bg-warning/15 text-warning',
  confirmed: 'border-info/60 bg-info/15 text-info',
  in_progress: 'border-accent/70 bg-accent/25 text-[#c7d2fe]',
  completed: 'border-success/60 bg-success/15 text-success',
  cancelled: 'border-danger/40 bg-danger/10 text-danger/80 line-through',
  no_show: 'border-line bg-surface-2 text-subtle',
};

/** Posición vertical (px) de un minuto del día dentro de la grilla. */
export const minuteToPx = (minutes: number): number => ((minutes - START_HOUR * 60) / 60) * HOUR_PX;
