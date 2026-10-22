import React, { useMemo, useState } from 'react';
import { CalendarX } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input, Select, Textarea } from '@/components/common/Input';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { TimeGrid } from '@/components/appointments/TimeGrid';
import { useAvailability } from '@/hooks/useAvailability';
import { useSession } from '@/context/auth-context';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { appointmentEvents } from '@/services/appointmentEvents';
import { toUserMessage } from '@/services/firebase/helpers';
import { mergeTimes, pickAnyBarber } from '@/domain/availability';
import { addDays, businessDate } from '@/domain/time';
import { formatCOP } from '@/lib/format';
import type { Barber } from '@/types/barber.types';
import type { Client } from '@/types/client.types';
import type { ServiceItem } from '@/types/service.types';
import type { BusinessSettings } from '@/types/settings.types';
import type { Appointment } from '@/types/appointment.types';

const ANY = '__any__';

/** Agendamiento desde mostrador (administrador). Usa el mismo motor de disponibilidad que el portal. */
export const BookingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onBooked: () => void;
  clients: Client[];
  services: ServiceItem[];
  barbers: Barber[];
  settings: BusinessSettings;
}> = ({ isOpen, onClose, onBooked, clients, services, barbers, settings }) => {
  const { actor } = useSession();
  const activeServices = services.filter((s) => s.status === 'active');
  const activeBarbers = barbers.filter((b) => b.status === 'active');
  const activeClients = clients.filter((c) => c.status === 'active');

  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState(ANY);
  const [date, setDate] = useState(businessDate());
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = activeServices.find((s) => s.id === serviceId);
  const candidates = useMemo(
    () => (barberId === ANY ? activeBarbers : activeBarbers.filter((b) => b.id === barberId)),
    [barberId, activeBarbers]
  );
  const availability = useAvailability({
    barbers: candidates,
    date,
    durationMinutes: service?.durationMinutes ?? 0,
    settings,
    enabled: isOpen && Boolean(service),
  });
  const options = availability.data ?? [];
  const times = mergeTimes(options);

  const reset = () => {
    setTime('');
    setNotes('');
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = activeClients.find((c) => c.id === clientId);
    const chosen = pickAnyBarber(options, time);
    if (!client || !service || !chosen) {
      setError('Selecciona cliente, servicio y un horario disponible.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        clientId: client.id,
        clientName: client.fullName,
        clientPhone: client.phone,
        barberId: chosen.barber.id,
        barberName: chosen.barber.fullName,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        durationMinutes: service.durationMinutes,
        date,
        time,
        notes,
      };
      const parties = { clientUserId: client.userId, barberUserId: chosen.barber.userId };
      const id = await appointmentsService.book(input, { status: 'confirmed', ...parties }, actor);
      const created = { ...input, id, status: 'confirmed' } as Appointment;
      await appointmentEvents.booked(created, parties, actor).catch(() => undefined);
      reset();
      onBooked();
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible agendar la cita.'));
      setTime('');
      availability.reload();
    } finally {
      setSaving(false);
    }
  };

  const today = businessDate();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agendar cita" description="Solo se muestran horarios realmente disponibles." size="lg">
      <form onSubmit={submit} className="space-y-4">
        {activeClients.length === 0 || activeServices.length === 0 || activeBarbers.length === 0 ? (
          <Alert tone="warning">Para agendar necesitas al menos un cliente, un servicio y un barbero activos.</Alert>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Cliente *" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Selecciona…</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} {c.phone && `· ${c.phone}`}
              </option>
            ))}
          </Select>
          <Select
            label="Servicio *"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setTime('');
            }}
            required
          >
            <option value="">Selecciona…</option>
            {activeServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatCOP(s.price)} · {s.durationMinutes} min
              </option>
            ))}
          </Select>
          <Select
            label="Barbero"
            value={barberId}
            onChange={(e) => {
              setBarberId(e.target.value);
              setTime('');
            }}
          >
            <option value={ANY}>Cualquier barbero disponible</option>
            {activeBarbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.fullName}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha *"
            type="date"
            min={today}
            max={addDays(today, settings.bookingWindowDays)}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime('');
            }}
            required
          />
        </div>

        <div>
          <p className="field-label">Hora *</p>
          {!service ? (
            <p className="text-sm text-subtle">Elige un servicio para ver los horarios.</p>
          ) : availability.loading ? (
            <Spinner label="Consultando disponibilidad…" />
          ) : availability.error ? (
            <Alert>{availability.error}</Alert>
          ) : times.length === 0 ? (
            <EmptyState icon={CalendarX} title="Sin horarios disponibles" description="Prueba otra fecha u otro barbero." />
          ) : (
            <TimeGrid times={times} value={time} onChange={setTime} label="Horarios disponibles" />
          )}
          {time && barberId === ANY && (
            <p className="mt-2 text-xs text-muted">Se asignará a {pickAnyBarber(options, time)?.barber.fullName}.</p>
          )}
        </div>

        <Textarea label="Nota (visible para el cliente y el barbero)" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving} disabled={!time || !clientId}>
            Confirmar cita
          </Button>
        </div>
      </form>
    </Modal>
  );
};
