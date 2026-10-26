import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';
import { addDays, businessDate, businessMinutes, fromMinutes, startOfWeek, toMinutes, WEEKDAY_LABELS } from '@/domain/time';
import type { Appointment, AppointmentStatus } from '@/types/appointment.types';

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_PX = 56;

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: 'border-warning/60 bg-warning/15 text-warning',
  confirmed: 'border-info/60 bg-info/15 text-info',
  in_progress: 'border-accent/70 bg-accent/25 text-[#c7d2fe]',
  completed: 'border-success/60 bg-success/15 text-success',
  cancelled: 'border-danger/40 bg-danger/10 text-danger/80 line-through',
  no_show: 'border-line bg-surface-2 text-subtle',
};

export const WeekCalendar: React.FC<{
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
  appointments: Appointment[];
  selectedId: string | null;
  onSelect: (appointment: Appointment) => void;
  showBarber: boolean;
}> = ({ weekStart, onWeekChange, appointments, selectedId, onSelect, showBarber }) => {
  const today = businessDate();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const height = (END_HOUR - START_HOUR) * HOUR_PX;
  const nowTop = ((businessMinutes() - START_HOUR * 60) / 60) * HOUR_PX;
  const fmt = (d: string) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));

  return (
    <section className="card overflow-hidden" aria-label="Calendario semanal">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          Semana del {fmt(days[0])} al {fmt(days[6])}
        </h2>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Semana anterior" onClick={() => onWeekChange(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onWeekChange(startOfWeek(today))}>
            Hoy
          </Button>
          <Button size="icon" variant="ghost" aria-label="Semana siguiente" onClick={() => onWeekChange(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line">
            <div />
            {days.map((d) => (
              <div key={d} className={cn('px-2 py-2 text-center text-xs', d === today ? 'font-semibold text-accent' : 'text-muted')}>
                {WEEKDAY_LABELS[new Date(`${d}T00:00:00Z`).getUTCDay()].slice(0, 3)} {fmt(d)}
              </div>
            ))}
          </div>

          <div className="relative grid grid-cols-[56px_repeat(7,1fr)]" style={{ height }}>
            <div className="relative">
              {hours.map((h) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-subtle" style={{ top: (h - START_HOUR) * HOUR_PX }}>
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            {days.map((d) => {
              const dayAppts = appointments.filter((a) => a.date === d);
              return (
                <div key={d} className={cn('relative border-l border-line', d === today && 'bg-accent/[0.04]')}>
                  {hours.map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-line/50" style={{ top: (h - START_HOUR) * HOUR_PX }} />
                  ))}
                  {d === today && nowTop > 0 && nowTop < height && (
                    <div className="absolute inset-x-0 z-10 h-px bg-danger" style={{ top: nowTop }} aria-hidden />
                  )}
                  {dayAppts.map((a) => {
                    const start = toMinutes(a.time);
                    const top = ((start - START_HOUR * 60) / 60) * HOUR_PX;
                    const h = Math.max((a.durationMinutes / 60) * HOUR_PX - 2, 22);
                    if (top + h < 0 || top > height) return null;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onSelect(a)}
                        title={`${a.time}–${fromMinutes(start + a.durationMinutes)} · ${a.clientName} · ${a.serviceName}${showBarber ? ` · ${a.barberName}` : ''}`}
                        className={cn(
                          'absolute inset-x-1 overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight transition hover:brightness-125',
                          STATUS_STYLES[a.status],
                          selectedId === a.id && 'ring-2 ring-accent'
                        )}
                        style={{ top: Math.max(top, 0), height: h }}
                      >
                        <span className="block font-semibold tabular-nums">{a.time}</span>
                        <span className="block truncate text-ink/90">{a.clientName}</span>
                        {h > 50 && <span className="block truncate opacity-80">{showBarber ? a.barberName : a.serviceName}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
