import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import { PageHeader, Segmented } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { Alert, EmptyState, SkeletonRows } from '@/components/common/Feedback';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { BookingModal } from './BookingModal';
import { WeekCalendar } from '@/components/appointments/WeekCalendar';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { useAsync } from '@/hooks/useAsync';
import { useSettings } from '@/hooks/useSettings';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { clientsService } from '@/services/firebase/clients.service';
import { servicesService } from '@/services/firebase/services.service';
import { barbersService } from '@/services/firebase/barbers.service';
import { STATUS_LABELS } from '@/domain/appointmentStatus';
import { addDays, businessDate, formatLongDate, startOfWeek } from '@/domain/time';
import { formatCOP } from '@/lib/format';
import type { AppointmentStatus } from '@/types/appointment.types';

type RangePreset = 'calendar' | 'today' | 'tomorrow' | 'week' | 'custom';

export const AppointmentsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const today = businessDate();
  const [preset, setPreset] = useState<RangePreset>('calendar');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [custom, setCustom] = useState({ from: today, to: addDays(today, 7) });
  const [barberFilter, setBarberFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const isModalOpen = params.get('nueva') === '1';

  const range =
    preset === 'calendar'
      ? { from: weekStart, to: addDays(weekStart, 6) }
      : preset === 'today'
      ? { from: today, to: today }
      : preset === 'tomorrow'
        ? { from: addDays(today, 1), to: addDays(today, 1) }
        : preset === 'week'
          ? { from: today, to: addDays(today, 6) }
          : custom;

  const { settings } = useSettings();
  const appointments = useAsync(() => appointmentsService.listByRange(range.from, range.to), [range.from, range.to]);
  const catalog = useAsync(
    () => Promise.all([clientsService.getClients(), servicesService.getServices(), barbersService.getBarbers()]),
    []
  );
  const [clients, services, barbers] = catalog.data ?? [[], [], []];

  const filtered = useMemo(
    () =>
      (appointments.data ?? []).filter(
        (a) => (barberFilter === 'all' || a.barberId === barberFilter) && (statusFilter === 'all' || a.status === statusFilter)
      ),
    [appointments.data, barberFilter, statusFilter]
  );

  const selected = filtered.find((a) => a.id === selectedId) ?? null;

  const byDate = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const a of filtered) groups.set(a.date, [...(groups.get(a.date) ?? []), a]);
    return [...groups.entries()];
  }, [filtered]);

  const setModal = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) next.set('nueva', '1');
    else next.delete('nueva');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Agenda general"
        description="Citas de todos los barberos, con disponibilidad y estados en tiempo real."
        actions={
          <Button onClick={() => setModal(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Nueva cita
          </Button>
        }
      />

      <div className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
        <Segmented
          label="Rango de fechas"
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'calendar', label: 'Calendario' },
            { value: 'today', label: 'Hoy' },
            { value: 'tomorrow', label: 'Mañana' },
            { value: 'week', label: '7 días' },
            { value: 'custom', label: 'Personalizado' },
          ]}
        />
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 lg:w-80">
            <Input label="Desde" type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <Input label="Hasta" type="date" min={custom.from} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </div>
        )}
        <div className="grid flex-1 grid-cols-2 gap-2 lg:ml-auto lg:max-w-md">
          <Select label="Barbero" value={barberFilter} onChange={(e) => setBarberFilter(e.target.value)}>
            <option value="all">Todos</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.fullName}
              </option>
            ))}
          </Select>
          <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {(appointments.error || catalog.error) && <Alert>{appointments.error ?? catalog.error}</Alert>}
      {actionError && <Alert>{actionError}</Alert>}

      {preset === 'calendar' ? (
        <>
          <WeekCalendar
            weekStart={weekStart}
            onWeekChange={(w) => {
              setWeekStart(w);
              setSelectedId(null);
            }}
            appointments={filtered}
            selectedId={selectedId}
            onSelect={(a) => setSelectedId(a.id)}
            showBarber
          />
          {appointments.loading && <SkeletonRows rows={1} />}
          {selected ? (
            <AppointmentCard
              appointment={selected}
              perspective="barber"
              actions={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">Barbero: {selected.barberName}</span>
                  <AppointmentActions
                    appointment={selected}
                    settings={settings}
                    onChanged={() => {
                      setActionError(null);
                      appointments.reload();
                    }}
                    onError={setActionError}
                  />
                </div>
              }
            />
          ) : (
            <p className="text-xs text-subtle">Haz clic en una cita del calendario para ver el detalle y cambiar su estado.</p>
          )}
        </>
      ) : appointments.loading ? (
        <div className="card">
          <SkeletonRows rows={5} />
        </div>
      ) : byDate.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CalendarDays}
            title="No hay citas en este rango"
            description="Cambia los filtros o agenda una nueva cita."
            action={<Button size="sm" onClick={() => setModal(true)}>Agendar cita</Button>}
          />
        </div>
      ) : (
        byDate.map(([date, list]) => (
          <section key={date} className="card overflow-hidden">
            <h2 className="border-b border-line px-5 py-3 text-sm font-semibold capitalize text-ink">
              {formatLongDate(date)} <span className="font-normal text-subtle">· {list.length} citas</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="table-base min-w-[820px]">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Barbero</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap font-medium tabular-nums">
                        {a.time}
                        <span className="block text-xs font-normal text-subtle">{a.durationMinutes} min</span>
                      </td>
                      <td>
                        {a.clientName}
                        <span className="block text-xs text-subtle">{a.clientPhone}</span>
                      </td>
                      <td>
                        {a.serviceName}
                        <span className="block text-xs text-subtle">{formatCOP(a.servicePrice)}</span>
                      </td>
                      <td>{a.barberName}</td>
                      <td>
                        <StatusBadge status={a.status} />
                        {a.status === 'completed' && (
                          <span className={`mt-1 block text-xs ${a.saleId ? 'text-success' : 'text-warning'}`}>
                            {a.saleId ? 'Cobrada' : 'Por cobrar'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <AppointmentActions
                            appointment={a}
                            settings={settings}
                            onChanged={() => {
                              setActionError(null);
                              appointments.reload();
                            }}
                            onError={setActionError}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {isModalOpen && (
        <BookingModal
          isOpen
          onClose={() => setModal(false)}
          onBooked={() => {
            setModal(false);
            appointments.reload();
          }}
          clients={clients}
          services={services}
          barbers={barbers}
          settings={settings}
        />
      )}
    </>
  );
};
