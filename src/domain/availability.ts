import type { DaySchedule, WeeklySchedule } from '@/types/barber.types';
import { fromMinutes, isValidTime, toMinutes, weekday } from './time';

/**
 * Granularidad de la agenda. Cada cita bloquea ceil(duración / SLOT_MINUTES) franjas.
 * Es fija (y está replicada en firestore.rules) para que el servidor pueda validar las franjas.
 */
export const SLOT_MINUTES = 15;
/** Límite de duración: mantiene las validaciones de las reglas dentro de sus cuotas de lectura. */
export const MAX_SERVICE_MINUTES = 120;

export const slotCount = (durationMinutes: number): number =>
  Math.ceil(durationMinutes / SLOT_MINUTES);

export const slotKey = (barberId: string, date: string, minutes: number): string =>
  `${barberId}_${date}_${fromMinutes(minutes).replace(':', '')}`;

/** Claves de franja que ocupa una cita. Son los ids de los documentos de bloqueo en Firestore. */
export const slotKeysFor = (
  barberId: string,
  date: string,
  time: string,
  durationMinutes: number
): string[] => {
  const start = toMinutes(time);
  return Array.from({ length: slotCount(durationMinutes) }, (_, i) =>
    slotKey(barberId, date, start + i * SLOT_MINUTES)
  );
};

export const scheduleForDate = (schedule: WeeklySchedule, date: string): DaySchedule | null =>
  schedule[String(weekday(date))] ?? null;

export const isValidDaySchedule = (day: DaySchedule): boolean => {
  if (!isValidTime(day.start) || !isValidTime(day.end)) return false;
  if (toMinutes(day.start) >= toMinutes(day.end)) return false;
  const hasBreak = Boolean(day.breakStart) || Boolean(day.breakEnd);
  if (!hasBreak) return true;
  if (!day.breakStart || !day.breakEnd) return false;
  if (!isValidTime(day.breakStart) || !isValidTime(day.breakEnd)) return false;
  const bs = toMinutes(day.breakStart);
  const be = toMinutes(day.breakEnd);
  return bs < be && bs >= toMinutes(day.start) && be <= toMinutes(day.end);
};

export interface AvailabilityInput {
  barberId: string;
  schedule: WeeklySchedule;
  blockedDates: string[];
  date: string;
  durationMinutes: number;
  /** Claves de franja ya ocupadas para ese barbero y fecha. */
  takenSlots: ReadonlySet<string>;
  /** Fecha y minutos actuales en la zona del negocio, para no ofrecer horas pasadas. */
  today: string;
  nowMinutes: number;
  /** Antelación mínima para reservar (minutos). */
  minLeadMinutes: number;
  /** Última fecha reservable (YYYY-MM-DD). */
  lastBookableDate: string;
  /** Cita que se está reprogramando: sus franjas cuentan como libres. */
  ignoreSlots?: ReadonlySet<string>;
}

/** Horas de inicio (HH:mm) en las que el servicio cabe completo en la jornada del barbero. */
export const availableStartTimes = (input: AvailabilityInput): string[] => {
  const { date, today, durationMinutes } = input;
  if (durationMinutes <= 0 || durationMinutes > MAX_SERVICE_MINUTES) return [];
  if (date < today || date > input.lastBookableDate) return [];
  if (input.blockedDates.includes(date)) return [];

  const day = scheduleForDate(input.schedule, date);
  if (!day || !isValidDaySchedule(day)) return [];

  const dayStart = toMinutes(day.start);
  const dayEnd = toMinutes(day.end);
  const breakStart = day.breakStart ? toMinutes(day.breakStart) : null;
  const breakEnd = day.breakEnd ? toMinutes(day.breakEnd) : null;
  const blocked = slotCount(durationMinutes) * SLOT_MINUTES;
  const earliest = date === today ? input.nowMinutes + input.minLeadMinutes : -1;

  const result: string[] = [];
  for (let start = dayStart; start + durationMinutes <= dayEnd; start += SLOT_MINUTES) {
    if (start < earliest) continue;
    const end = start + blocked;
    if (breakStart !== null && breakEnd !== null && start < breakEnd && end > breakStart) continue;
    let free = true;
    for (let m = start; m < end; m += SLOT_MINUTES) {
      const key = slotKey(input.barberId, date, m);
      if (input.takenSlots.has(key) && !input.ignoreSlots?.has(key)) {
        free = false;
        break;
      }
    }
    if (free) result.push(fromMinutes(start));
  }
  return result;
};

/**
 * Opción "cualquier barbero": entre quienes tienen libre la hora elegida, asigna al que tiene
 * más horarios libres ese día (el menos ocupado). Empate: orden alfabético estable.
 */
export const pickAnyBarber = <T extends { barber: { id: string; fullName: string }; times: string[] }>(
  options: T[],
  time: string
): T | null =>
  options
    .filter((o) => o.times.includes(time))
    .sort((a, b) => b.times.length - a.times.length || a.barber.fullName.localeCompare(b.barber.fullName))[0] ?? null;

/** Unión ordenada de horarios de varios barberos. */
export const mergeTimes = (options: { times: string[] }[]): string[] =>
  [...new Set(options.flatMap((o) => o.times))].sort();

/** true si el barbero tiene al menos un día laborable válido configurado. */
export const hasWorkingDays = (schedule: WeeklySchedule): boolean =>
  Object.values(schedule).some((day) => day !== null && isValidDaySchedule(day));
