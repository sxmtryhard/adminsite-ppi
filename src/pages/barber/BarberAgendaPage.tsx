import React, { useMemo, useState } from 'react';
import { CalendarDays, Search } from 'lucide-react';
import { PageHeader, Segmented } from '@/components/common/Layout';
import { Input, Select } from '@/components/common/Input';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { useAsync } from '@/hooks/useAsync';
import { useSettings } from '@/hooks/useSettings';
import { useSession } from '@/context/auth-context';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { ACTIVE_STATUSES, STATUS_LABELS } from '@/domain/appointmentStatus';
import { businessDate } from '@/domain/time';
import type { AppointmentStatus } from '@/types/appointment.types';

export const BarberAgendaPage: React.FC = () => {
  const { user } = useSession();
  const { settings } = useSettings();
  const today = businessDate();
  const [view, setView] = useState<'upcoming' | 'history'>('upcoming');
  const [status, setStatus] = useState<'all' | AppointmentStatus>('all');
  const [range, setRange] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const data = useAsync(
    () => (user.barberId ? appointmentsService.listForBarber(user.barberId) : Promise.resolve([])),
    [user.barberId]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data.data ?? []).filter((a) => {
      const inView = view === 'upcoming' ? a.date >= today && ACTIVE_STATUSES.includes(a.status) : a.date < today || !ACTIVE_STATUSES.includes(a.status);
      return (
        inView &&
        (status === 'all' || a.status === status) &&
        (!range.from || a.date >= range.from) &&
        (!range.to || a.date <= range.to) &&
        (!q || a.clientName.toLowerCase().includes(q) || a.serviceName.toLowerCase().includes(q))
      );
    });
    return view === 'history' ? [...list].reverse() : list;
  }, [data.data, view, status, range, search, today]);

  if (!user.barberId) return <Alert tone="warning">Tu cuenta no está vinculada a un barbero.</Alert>;

  return (
    <>
      <PageHeader title="Mi agenda" description="Citas asignadas a ti. Actualiza su estado a medida que avanzas." />
      <div className="card flex flex-col gap-3 p-4">
        <Segmented
          label="Vista"
          value={view}
          onChange={setView}
          options={[
            { value: 'upcoming', label: 'Próximas' },
            { value: 'history', label: 'Historial' },
          ]}
        />
        <div className="grid gap-2 sm:grid-cols-4">
          <Input label="Desde" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <Input label="Hasta" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">Todos</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Input label="Cliente o servicio" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      {(data.error || error) && <Alert>{data.error ?? error}</Alert>}
      {data.loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState icon={CalendarDays} title="No hay citas con estos filtros" />
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              perspective="barber"
              actions={
                ACTIVE_STATUSES.includes(a.status) ? (
                  <AppointmentActions
                    appointment={a}
                    settings={settings}
                    onChanged={() => {
                      setError(null);
                      data.reload();
                    }}
                    onError={setError}
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </>
  );
};
