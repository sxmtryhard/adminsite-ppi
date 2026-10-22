import React, { useState } from 'react';
import { CalendarX } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { TimeGrid } from './TimeGrid';
import { useAsync } from '@/hooks/useAsync';
import { useAvailability } from '@/hooks/useAvailability';
import { barbersService } from '@/services/firebase/barbers.service';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { appointmentEvents } from '@/services/appointmentEvents';
import { toUserMessage } from '@/services/firebase/helpers';
import { useSession } from '@/context/auth-context';
import type { Appointment } from '@/types/appointment.types';
import type { BusinessSettings } from '@/types/settings.types';
import { addDays, businessDate } from '@/domain/time';

export const RescheduleModal: React.FC<{
  appointment: Appointment | null;
  settings: BusinessSettings;
  onClose: () => void;
  onDone: () => void;
}> = ({ appointment, settings, onClose, onDone }) => {
  const { user, actor } = useSession();
  const [date, setDate] = useState(appointment?.date ?? businessDate());
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const barber = useAsync(
    () => (appointment ? barbersService.getBarber(appointment.barberId) : Promise.resolve(null)),
    [appointment?.barberId]
  );
  const availability = useAvailability({
    barbers: barber.data ? [barber.data] : [],
    date,
    durationMinutes: appointment?.durationMinutes ?? 0,
    settings,
    ignoreSlots: appointment?.date === date ? appointment.slotIds : [],
    enabled: Boolean(appointment && barber.data),
  });
  const times = availability.data?.[0]?.times ?? [];

  const submit = async () => {
    if (!appointment || !time) return;
    setSaving(true);
    setError(null);
    try {
      const result = await appointmentsService.reschedule(
        appointment.id,
        date,
        time,
        { role: user.role, cancellationMinHours: settings.cancellationMinHours },
        actor
      );
      await appointmentEvents.rescheduled(result.appointment, result, actor).catch(() => undefined);
      onDone();
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible reprogramar la cita.'));
      availability.reload();
    } finally {
      setSaving(false);
    }
  };

  const today = businessDate();
  return (
    <Modal
      isOpen={Boolean(appointment)}
      onClose={onClose}
      title="Reprogramar cita"
      description={appointment ? `${appointment.serviceName} · ${appointment.barberName}` : undefined}
    >
      <div className="space-y-4">
        <Input
          label="Nueva fecha"
          type="date"
          min={today}
          max={addDays(today, settings.bookingWindowDays)}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setTime('');
          }}
        />
        {barber.loading || availability.loading ? (
          <Spinner label="Consultando disponibilidad…" />
        ) : availability.error || barber.error ? (
          <Alert>{availability.error ?? barber.error}</Alert>
        ) : times.length === 0 ? (
          <EmptyState icon={CalendarX} title="Sin horarios disponibles" description="Prueba con otra fecha." />
        ) : (
          <TimeGrid times={times} value={time} onChange={setTime} label="Horarios disponibles" />
        )}
        {user.role === 'client' && (
          <p className="text-xs text-subtle">Al reprogramar, tu cita vuelve a quedar pendiente de confirmación.</p>
        )}
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={submit} disabled={!time} isLoading={saving}>
            Confirmar cambio
          </Button>
        </div>
      </div>
    </Modal>
  );
};
