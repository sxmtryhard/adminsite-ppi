import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Feedback';
import { isValidDaySchedule } from '@/domain/availability';
import { toUserMessage } from '@/services/firebase/helpers';
import { businessDate, formatLongDate, WEEKDAY_LABELS } from '@/domain/time';
import type { DaySchedule, WeeklySchedule } from '@/types/barber.types';

const DAY_ORDER = ['1', '2', '3', '4', '5', '6', '0'];

/** Edición de jornada semanal, descansos y ausencias puntuales. */
export const ScheduleEditor: React.FC<{
  initialSchedule: WeeklySchedule;
  initialBlocked: string[];
  onSave: (schedule: WeeklySchedule, blocked: string[]) => Promise<void>;
}> = ({ initialSchedule, initialBlocked, onSave }) => {
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule);
  const [blocked, setBlocked] = useState<string[]>(initialBlocked);
  const [newBlocked, setNewBlocked] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  const today = businessDate();
  const invalidDays = DAY_ORDER.filter((d) => schedule[d] && !isValidDaySchedule(schedule[d] as DaySchedule));

  const updateDay = (day: string, patch: Partial<DaySchedule> | null) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: patch === null ? null : { ...(prev[day] ?? { start: '09:00', end: '18:00', breakStart: null, breakEnd: null }), ...patch },
    }));
  };

  const save = async () => {
    if (invalidDays.length) return;
    setSaving(true);
    setMessage(null);
    try {
      await onSave(schedule, blocked.filter((d) => d >= today));
      setMessage({ tone: 'success', text: 'Disponibilidad guardada. Las nuevas reservas ya usan este horario.' });
    } catch (err) {
      setMessage({ tone: 'error', text: toUserMessage(err, 'No fue posible guardar la disponibilidad.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {DAY_ORDER.map((day) => {
          const value = schedule[day];
          const invalid = invalidDays.includes(day);
          return (
            <div key={day} className={`rounded-2xl border p-3 ${invalid ? 'border-danger/50' : 'border-line'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex w-32 items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[rgb(var(--accent))]"
                    checked={Boolean(value)}
                    onChange={(e) => updateDay(day, e.target.checked ? {} : null)}
                  />
                  {WEEKDAY_LABELS[Number(day)]}
                </label>
                {value ? (
                  <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                    <Input aria-label="Inicio" type="time" value={value.start} onChange={(e) => updateDay(day, { start: e.target.value })} />
                    <Input aria-label="Fin" type="time" value={value.end} onChange={(e) => updateDay(day, { end: e.target.value })} />
                    <Input
                      aria-label="Inicio de descanso"
                      type="time"
                      value={value.breakStart ?? ''}
                      onChange={(e) => updateDay(day, { breakStart: e.target.value || null })}
                    />
                    <Input
                      aria-label="Fin de descanso"
                      type="time"
                      value={value.breakEnd ?? ''}
                      onChange={(e) => updateDay(day, { breakEnd: e.target.value || null })}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-subtle">No laborable</span>
                )}
              </div>
              {invalid && <p className="mt-2 text-xs text-danger">Revisa el horario: el fin debe ser posterior al inicio y el descanso debe estar dentro de la jornada.</p>}
            </div>
          );
        })}
        <p className="text-xs text-subtle">Columnas: inicio · fin · inicio de descanso · fin de descanso (el descanso es opcional).</p>
      </div>

      <div>
        <p className="field-label">Ausencias y días no laborables puntuales</p>
        <div className="flex gap-2">
          <Input aria-label="Fecha de ausencia" type="date" min={today} value={newBlocked} onChange={(e) => setNewBlocked(e.target.value)} />
          <Button
            variant="subtle"
            onClick={() => {
              if (newBlocked && !blocked.includes(newBlocked)) setBlocked([...blocked, newBlocked].sort());
              setNewBlocked('');
            }}
            disabled={!newBlocked}
          >
            <Plus className="h-4 w-4" aria-hidden /> Agregar
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {blocked.filter((d) => d >= today).map((d) => (
            <span key={d} className="chip border-line bg-surface-2 text-ink">
              <span className="capitalize">{formatLongDate(d)}</span>
              <button onClick={() => setBlocked(blocked.filter((x) => x !== d))} aria-label={`Quitar ${d}`} className="text-muted hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <p className="mt-1 text-xs text-subtle">Las citas ya agendadas en esas fechas no se cancelan automáticamente; revísalas en la agenda.</p>
      </div>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="flex justify-end">
        <Button onClick={save} isLoading={saving} disabled={invalidDays.length > 0}>
          Guardar disponibilidad
        </Button>
      </div>
    </div>
  );
};
