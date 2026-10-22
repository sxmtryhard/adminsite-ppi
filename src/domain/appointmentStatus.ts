import type { AppointmentStatus } from '@/types/appointment.types';
import type { UserRole } from '@/types/auth.types';

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

/** Estados que mantienen ocupadas las franjas del barbero. */
export const ACTIVE_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress'];

/** Transiciones válidas del flujo de una cita. Replicadas en firestore.rules. */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const nextStatuses = (from: AppointmentStatus, role: UserRole): AppointmentStatus[] => {
  if (role === 'client') return ACTIVE_STATUSES.includes(from) && from !== 'in_progress' ? ['cancelled'] : [];
  return TRANSITIONS[from];
};

export const canTransition = (
  from: AppointmentStatus,
  to: AppointmentStatus,
  role: UserRole
): boolean => nextStatuses(from, role).includes(to);

export const releasesSlots = (status: AppointmentStatus): boolean => !ACTIVE_STATUSES.includes(status);

/**
 * Política de cancelación/reprogramación para clientes: deben hacerlo con al menos
 * `minHours` de antelación. El personal no está sujeto a este límite.
 */
export const clientCanModify = (startAt: Date, now: Date, minHours: number): boolean =>
  startAt.getTime() - now.getTime() >= minHours * 3_600_000;
