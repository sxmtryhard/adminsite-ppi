import { useAsync } from './useAsync';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { availableStartTimes } from '@/domain/availability';
import { addDays, businessDate, businessMinutes } from '@/domain/time';
import type { Barber } from '@/types/barber.types';
import type { BusinessSettings } from '@/types/settings.types';

export interface BarberTimes {
  barber: Barber;
  times: string[];
}

/**
 * Horarios realmente disponibles para un servicio en una fecha, por barbero.
 * Consulta los bloqueos actuales en Firestore; la confirmación final la hace la transacción.
 */
export const useAvailability = (params: {
  barbers: Barber[];
  date: string;
  durationMinutes: number;
  settings: BusinessSettings;
  /** Franjas de la cita que se reprograma (cuentan como libres). */
  ignoreSlots?: string[];
  enabled: boolean;
}) => {
  const { barbers, date, durationMinutes, settings, ignoreSlots, enabled } = params;
  const key = barbers.map((b) => b.id).join(',');

  return useAsync<BarberTimes[]>(async () => {
    if (!enabled || !date || durationMinutes <= 0) return [];
    const now = new Date();
    const today = businessDate(now);
    const ignore = new Set(ignoreSlots ?? []);
    const results = await Promise.all(
      barbers
        .filter((b) => b.status === 'active')
        .map(async (barber) => {
          const taken = await appointmentsService.takenSlots(barber.id, date);
          const times = availableStartTimes({
            barberId: barber.id,
            schedule: barber.schedule,
            blockedDates: barber.blockedDates,
            date,
            durationMinutes,
            takenSlots: taken,
            ignoreSlots: ignore,
            today,
            nowMinutes: businessMinutes(now),
            minLeadMinutes: settings.minLeadMinutes,
            lastBookableDate: addDays(today, settings.bookingWindowDays),
          });
          return { barber, times };
        })
    );
    return results;
  }, [key, date, durationMinutes, enabled, settings.minLeadMinutes, settings.bookingWindowDays, (ignoreSlots ?? []).join(',')]);
};
