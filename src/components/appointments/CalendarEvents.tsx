import React from 'react';
import { cn } from '@/lib/utils';
import { fromMinutes, toMinutes } from '@/domain/time';
import { layoutLanes } from '@/domain/calendarLayout';
import type { Appointment } from '@/types/appointment.types';
import { END_HOUR, HOUR_PX, START_HOUR, STATUS_STYLES, minuteToPx } from './calendarShared';

/** Citas de una columna del calendario; las que se cruzan se muestran lado a lado. */
export const CalendarEvents: React.FC<{
  appointments: Appointment[];
  selectedId: string | null;
  onSelect: (appointment: Appointment) => void;
  /** Tercera línea del bloque cuando hay espacio. */
  detail: (appointment: Appointment) => string;
}> = ({ appointments, selectedId, onSelect, detail }) => {
  const height = (END_HOUR - START_HOUR) * HOUR_PX;
  const lanes = layoutLanes(
    appointments.map((a) => {
      const start = toMinutes(a.time);
      return { id: a.id, start, end: start + a.durationMinutes };
    })
  );

  return (
    <>
      {appointments.map((a) => {
        const start = toMinutes(a.time);
        const top = minuteToPx(start);
        const h = Math.max((a.durationMinutes / 60) * HOUR_PX - 2, 22);
        if (top + h < 0 || top > height) return null;
        const { lane, lanes: count } = lanes.get(a.id) ?? { lane: 0, lanes: 1 };
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            title={`${a.time}–${fromMinutes(start + a.durationMinutes)} · ${a.clientName} · ${a.serviceName} · ${a.barberName}`}
            className={cn(
              'absolute z-[5] overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight transition hover:z-20 hover:brightness-125',
              STATUS_STYLES[a.status],
              selectedId === a.id && 'z-20 ring-2 ring-accent'
            )}
            style={{
              top: Math.max(top, 0),
              height: h,
              left: `calc(${(lane / count) * 100}% + 4px)`,
              width: `calc(${100 / count}% - 8px)`,
            }}
          >
            <span className="block font-semibold tabular-nums">{a.time}</span>
            <span className="block truncate text-ink/90">{a.clientName}</span>
            {h > 50 && <span className="block truncate opacity-80">{detail(a)}</span>}
          </button>
        );
      })}
    </>
  );
};
