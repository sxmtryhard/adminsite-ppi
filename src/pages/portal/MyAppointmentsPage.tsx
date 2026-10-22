import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { PageHeader, Segmented } from '@/components/common/Layout';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { useAsync } from '@/hooks/useAsync';
import { useSettings } from '@/hooks/useSettings';
import { useSession } from '@/context/auth-context';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { ACTIVE_STATUSES } from '@/domain/appointmentStatus';
import { businessDate } from '@/domain/time';

export const MyAppointmentsPage: React.FC = () => {
  const { user } = useSession();
  const { settings } = useSettings();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [error, setError] = useState<string | null>(null);
  const today = businessDate();
  const appts = useAsync(() => appointmentsService.listForClient(user.uid), [user.uid]);

  const list = (appts.data ?? []).filter((a) =>
    view === 'upcoming' ? a.date >= today && ACTIVE_STATUSES.includes(a.status) : a.date < today || !ACTIVE_STATUSES.includes(a.status)
  );
  const ordered = view === 'past' ? [...list].reverse() : list;

  return (
    <>
      <PageHeader title="Mis citas" description={`Puedes cancelar o reprogramar hasta ${settings.cancellationMinHours} h antes.`} />
      <Segmented
        label="Citas"
        value={view}
        onChange={setView}
        options={[
          { value: 'upcoming', label: 'Próximas' },
          { value: 'past', label: 'Anteriores' },
        ]}
      />
      {(appts.error || error) && <Alert>{appts.error ?? error}</Alert>}
      {appts.loading ? (
        <Spinner />
      ) : ordered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CalendarDays}
            title={view === 'upcoming' ? 'No tienes citas próximas' : 'Aún no tienes historial'}
            action={
              view === 'upcoming' ? (
                <Link to="/portal/reservar" className="text-sm text-accent hover:underline">
                  Reservar ahora
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {ordered.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              perspective="client"
              actions={
                view === 'upcoming' ? (
                  <AppointmentActions
                    appointment={a}
                    settings={settings}
                    onChanged={() => {
                      setError(null);
                      appts.reload();
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
