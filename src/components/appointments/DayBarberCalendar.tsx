import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { addDays, businessDate, businessMinutes, formatLongDate, toMinutes } from '@/domain/time';
import { isValidDaySchedule, scheduleForDate } from '@/domain/availability';
import type { Appointment } from '@/types/appointment.types';
import type { Barber } from '@/types/barber.types';
import { END_HOUR, HOUR_PX, START_HOUR, minuteToPx } from './calendarShared';
import { CalendarEvents } from './CalendarEvents';

const GRID_START = START_HOUR * 60;
const GRID_END = END_HOUR * 60;

/** Tramos fuera de la jornada del barbero ese día (antes, descanso y después), en minutos. */
const offHours = (barber: Barber, date: string): [number, number][] | 'off' => {
  const day = scheduleForDate(barber.schedule, date);
  if (barber.blockedDates.includes(date) || !day || !isValidDaySchedule(day)) return 'off';
  const ranges: [number, number][] = [[GRID_START, toMinutes(day.start)]];
  if (day.breakStart && day.breakEnd) ranges.push([toMinutes(day.breakStart), toMinutes(day.breakEnd)]);
  ranges.push([toMinutes(day.end), GRID_END]);
  return ranges.filter(([s, e]) => e > s);
};

/**
 * Agenda de un día con una columna por barbero: en la misma fila caben varias citas
 * (una por barbero) y en una misma columna no se cruzan, porque el bloqueo de franjas lo impide.
 */
export const DayBarberCalendar: React.FC<{
  date: string;
  onDateChange: (date: string) => void;
  barbers: Barber[];
  appointments: Appointment[];
  selectedId: string | null;
  onSelect: (appointment: Appointment) => void;
}> = ({ date, onDateChange, barbers, appointments, selectedId, onSelect }) => {
  const today = businessDate();
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const height = (END_HOUR - START_HOUR) * HOUR_PX;
  const nowTop = minuteToPx(businessMinutes());
  const columns = `56px repeat(${Math.max(barbers.length, 1)}, minmax(150px, 1fr))`;

  return (
    <section className="card overflow-hidden" aria-label="Agenda del día por barbero">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold capitalize text-ink">{formatLongDate(date)}</h2>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Día anterior" onClick={() => onDateChange(addDays(date, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDateChange(today)} disabled={date === today}>
            Hoy
          </Button>
          <Button size="icon" variant="ghost" aria-label="Día siguiente" onClick={() => onDateChange(addDays(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {barbers.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">No hay barberos activos para mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 56 + barbers.length * 150 }}>
            <div className="grid border-b border-line" style={{ gridTemplateColumns: columns }}>
              <div />
              {barbers.map((b) => {
                const count = appointments.filter((a) => a.barberId === b.id && a.status !== 'cancelled').length;
                return (
                  <div key={b.id} className="border-l border-line px-2 py-2 text-center">
                    <p className="truncate text-xs font-semibold text-ink">{b.fullName}</p>
                    <p className="text-[10px] text-subtle">{count === 1 ? '1 cita' : `${count} citas`}</p>
                  </div>
                );
              })}
            </div>

            <div className="relative grid" style={{ gridTemplateColumns: columns, height }}>
              <div className="relative">
                {hours.map((h) => (
                  <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-subtle" style={{ top: (h - START_HOUR) * HOUR_PX }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {barbers.map((b) => {
                const off = offHours(b, date);
                return (
                  <div key={b.id} className="relative border-l border-line">
                    {off === 'off' ? (
                      <div className="absolute inset-0 flex items-start justify-center bg-surface-2/60 pt-6 text-[11px] text-subtle">
                        No trabaja este día
                      </div>
                    ) : (
                      off.map(([s, e]) => (
                        <div
                          key={s}
                          className="absolute inset-x-0 bg-surface-2/60"
                          style={{ top: Math.max(minuteToPx(s), 0), height: minuteToPx(Math.min(e, GRID_END)) - Math.max(minuteToPx(s), 0) }}
                          aria-hidden
                        />
                      ))
                    )}
                    {hours.map((h) => (
                      <div key={h} className="absolute inset-x-0 border-t border-line/50" style={{ top: (h - START_HOUR) * HOUR_PX }} />
                    ))}
                    {date === today && nowTop > 0 && nowTop < height && (
                      <div className="absolute inset-x-0 z-10 h-px bg-danger" style={{ top: nowTop }} aria-hidden />
                    )}
                    <CalendarEvents
                      appointments={appointments.filter((a) => a.barberId === b.id)}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      detail={(a) => a.serviceName}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
