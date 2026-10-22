import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, Clock, Scissors, Sparkles, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Textarea } from '@/components/common/Input';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { VerifyEmailBanner } from '@/components/common/VerifyEmailBanner';
import { NoTimesMessage } from '@/components/appointments/NoTimesMessage';
import { TimeGrid } from '@/components/appointments/TimeGrid';
import { useAsync } from '@/hooks/useAsync';
import { useAvailability } from '@/hooks/useAvailability';
import { useSettings } from '@/hooks/useSettings';
import { useSession } from '@/context/auth-context';
import { servicesService } from '@/services/firebase/services.service';
import { barbersService } from '@/services/firebase/barbers.service';
import { clientsService } from '@/services/firebase/clients.service';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { appointmentEvents } from '@/services/appointmentEvents';
import { toUserMessage } from '@/services/firebase/helpers';
import { mergeTimes, pickAnyBarber } from '@/domain/availability';
import { addDays, businessDate, formatLongDate } from '@/domain/time';
import { formatCOP } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment.types';

const ANY = '__any__';
const STEPS = ['Servicio', 'Barbero', 'Fecha y hora', 'Confirmar'];

export const BookingPage: React.FC = () => {
  const { user, actor } = useSession();
  const { settings } = useSettings();
  const catalog = useAsync(() => Promise.all([servicesService.getServices(), barbersService.getBarbers(), clientsService.getClient(user.uid)]), [user.uid]);
  const [services, barbers, client] = catalog.data ?? [[], [], null];
  const activeServices = services.filter((s) => s.status === 'active');
  const activeBarbers = useMemo(() => barbers.filter((b) => b.status === 'active'), [barbers]);

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState(ANY);
  const [date, setDate] = useState(businessDate());
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Appointment | null>(null);

  const service = activeServices.find((s) => s.id === serviceId);
  const candidates = useMemo(() => (barberId === ANY ? activeBarbers : activeBarbers.filter((b) => b.id === barberId)), [barberId, activeBarbers]);
  const availability = useAvailability({
    barbers: candidates,
    date,
    durationMinutes: service?.durationMinutes ?? 0,
    settings,
    enabled: step >= 2 && Boolean(service),
  });
  const options = availability.data ?? [];
  const times = mergeTimes(options);
  const assigned = time ? pickAnyBarber(options, time)?.barber ?? null : null;

  const confirm = async () => {
    if (!service || !assigned || !time) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        clientId: user.uid,
        clientName: client?.fullName ?? user.displayName,
        clientPhone: client?.phone ?? user.phone,
        barberId: assigned.id,
        barberName: assigned.fullName,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        durationMinutes: service.durationMinutes,
        date,
        time,
        notes,
      };
      const parties = { clientUserId: user.uid, barberUserId: assigned.userId };
      const id = await appointmentsService.book(input, { status: 'pending', ...parties }, actor);
      const created = { ...input, id, status: 'pending' } as Appointment;
      await appointmentEvents.booked(created, parties, actor, user.role).catch(() => undefined);
      setDone(created);
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible completar la reserva.'));
      setTime('');
      setStep(2);
      availability.reload();
    } finally {
      setSaving(false);
    }
  };

  if (!user.emailVerified) {
    return (
      <>
        <PageHeader title="Reservar cita" />
        <VerifyEmailBanner />
      </>
    );
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold text-ink">¡Reserva registrada!</h1>
        <p className="mt-2 text-sm text-muted">
          {done.serviceName} con {done.barberName}, <span className="capitalize">{formatLongDate(done.date)}</span> a las {done.time}. Quedó pendiente de
          confirmación del barbero; te avisaremos en tus notificaciones.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/portal/citas" className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-white">
            Ver mis citas
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setDone(null);
              setStep(0);
              setTime('');
              setNotes('');
            }}
          >
            Nueva reserva
          </Button>
        </div>
      </div>
    );
  }

  const today = businessDate();
  return (
    <>
      <PageHeader title="Reservar cita" description="Elige servicio, barbero y un horario disponible." />
      <ol className="flex gap-2" aria-label="Pasos de la reserva">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={cn('h-1 rounded-full', i <= step ? 'bg-accent' : 'bg-surface-2')} />
            <p className={cn('mt-1.5 hidden text-xs sm:block', i === step ? 'font-medium text-ink' : 'text-subtle')} aria-current={i === step ? 'step' : undefined}>
              {i + 1}. {label}
            </p>
          </li>
        ))}
      </ol>
      {catalog.error && <Alert>{catalog.error}</Alert>}
      {error && <Alert>{error}</Alert>}

      {catalog.loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
              <ChevronLeft className="h-4 w-4" aria-hidden /> Atrás
            </button>
          )}

          {step === 0 &&
            (activeServices.length === 0 ? (
              <div className="card">
                <EmptyState icon={Scissors} title="No hay servicios disponibles por ahora" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeServices.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServiceId(s.id);
                      setTime('');
                      setStep(1);
                    }}
                    className={cn('card p-5 text-left transition hover:border-accent/60', serviceId === s.id && 'border-accent')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-ink">{s.name}</p>
                      <p className="font-semibold text-ink">{formatCOP(s.price)}</p>
                    </div>
                    {s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-subtle">
                      <Clock className="h-3 w-3" aria-hidden /> {s.durationMinutes} min
                    </p>
                  </button>
                ))}
              </div>
            ))}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[{ id: ANY, fullName: 'Cualquier barbero', specialty: 'El primero disponible en tu horario' }, ...activeBarbers].map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBarberId(b.id);
                    setTime('');
                    setStep(2);
                  }}
                  className={cn('card flex items-center gap-3 p-5 text-left transition hover:border-accent/60', barberId === b.id && 'border-accent')}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-accent">
                    {b.id === ANY ? <Sparkles className="h-4 w-4" aria-hidden /> : <UserRound className="h-4 w-4" aria-hidden />}
                  </div>
                  <div>
                    <p className="font-medium text-ink">{b.fullName}</p>
                    <p className="text-xs text-muted">{b.specialty}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="card space-y-4 p-5">
              <div className="max-w-xs">
                <Input
                  label="Fecha"
                  type="date"
                  min={today}
                  max={addDays(today, settings.bookingWindowDays)}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime('');
                  }}
                />
              </div>
              {availability.loading ? (
                <Spinner label="Consultando horarios disponibles…" />
              ) : availability.error ? (
                <Alert>{availability.error}</Alert>
              ) : times.length === 0 ? (
                <NoTimesMessage barbers={candidates} />
              ) : (
                <TimeGrid times={times} value={time} onChange={setTime} label="Horarios disponibles" />
              )}
              <div className="flex justify-end">
                <Button disabled={!time} onClick={() => setStep(3)}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && service && assigned && (
            <div className="card max-w-xl space-y-4 p-6">
              <h2 className="text-base font-semibold text-ink">Revisa tu reserva</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted">Servicio</dt>
                <dd className="text-ink">
                  {service.name} · {service.durationMinutes} min
                </dd>
                <dt className="text-muted">Barbero</dt>
                <dd className="text-ink">{assigned.fullName}</dd>
                <dt className="text-muted">Fecha</dt>
                <dd className="capitalize text-ink">{formatLongDate(date)}</dd>
                <dt className="text-muted">Hora</dt>
                <dd className="text-ink">{time}</dd>
                <dt className="text-muted">Precio</dt>
                <dd className="font-semibold text-ink">{formatCOP(service.price)} · se paga en el estudio</dd>
              </dl>
              <Textarea label="Nota para el barbero (opcional)" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <p className="text-xs text-subtle">
                Puedes cancelar o reprogramar hasta {settings.cancellationMinHours} h antes de la cita.
              </p>
              <Button className="w-full" size="lg" onClick={confirm} isLoading={saving}>
                Confirmar reserva
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
