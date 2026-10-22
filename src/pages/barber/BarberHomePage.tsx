import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck2, CalendarClock, CheckCircle2, Coins, Percent } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/common/Layout';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { AppointmentActions } from '@/components/appointments/AppointmentActions';
import { useAsync } from '@/hooks/useAsync';
import { useSettings } from '@/hooks/useSettings';
import { useSession } from '@/context/auth-context';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { salesService } from '@/services/firebase/sales.service';
import { barbersService } from '@/services/firebase/barbers.service';
import { ACTIVE_STATUSES } from '@/domain/appointmentStatus';
import { commission, inPeriod, saleDate } from '@/domain/finance';
import { businessDate } from '@/domain/time';
import { formatCOP } from '@/lib/format';

/** Espacio personal del barbero: solo sus citas y sus ingresos atribuibles (nunca datos globales). */
export const BarberHomePage: React.FC = () => {
  const { user } = useSession();
  const barberId = user.barberId;
  const { settings } = useSettings();
  const [error, setError] = useState<string | null>(null);
  const today = businessDate();
  const month = { from: `${today.slice(0, 7)}-01`, to: today };

  const data = useAsync(
    () =>
      barberId
        ? Promise.all([appointmentsService.listForBarber(barberId), salesService.listForBarber(barberId), barbersService.getPrivate(barberId)])
        : Promise.resolve(null),
    [barberId]
  );

  if (!barberId) {
    return <Alert tone="warning">Tu cuenta aún no está vinculada a un perfil de barbero. Pide al administrador que la vincule.</Alert>;
  }

  const [appointments, sales, priv] = data.data ?? [[], [], { phone: '', commissionRate: null }];
  const todays = appointments.filter((a) => a.date === today && a.status !== 'cancelled');
  const upcoming = appointments.filter((a) => a.date > today && ACTIVE_STATUSES.includes(a.status)).slice(0, 5);
  const monthCompleted = appointments.filter((a) => a.status === 'completed' && inPeriod(a.date, month)).length;
  const monthServiceRevenue = sales
    .filter((s) => s.status === 'paid' && inPeriod(saleDate(s), month))
    .reduce((sum, s) => {
      const factor = s.subtotal > 0 ? s.total / s.subtotal : 0;
      return sum + s.items.filter((i) => i.type === 'service').reduce((acc, i) => acc + i.subtotal * factor, 0);
    }, 0);
  const myCommission = commission(monthServiceRevenue, priv.commissionRate);

  return (
    <>
      <PageHeader title={`Hola, ${user.displayName.split(' ')[0]}`} description="Tu agenda de hoy y tu desempeño del mes." />
      {(data.error || error) && <Alert>{data.error ?? error}</Alert>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Citas de hoy" icon={CalendarCheck2} loading={data.loading} value={String(todays.length)} hint={`${todays.filter((a) => a.status === 'completed').length} completadas`} />
        <StatCard label="Completadas este mes" icon={CheckCircle2} loading={data.loading} value={String(monthCompleted)} />
        <StatCard label="Servicios cobrados (mes)" icon={Coins} loading={data.loading} value={formatCOP(monthServiceRevenue)} hint="Atribuibles a ti" />
        <StatCard
          label="Comisión estimada (mes)"
          icon={Percent}
          loading={data.loading}
          value={myCommission === null ? 'No aplica' : formatCOP(myCommission)}
          hint={myCommission === null ? 'Sin política de comisiones configurada' : `${priv.commissionRate} % sobre servicios`}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Hoy</h2>
        {data.loading ? (
          <Spinner />
        ) : todays.length === 0 ? (
          <div className="card">
            <EmptyState icon={CalendarCheck2} title="No tienes citas hoy" />
          </div>
        ) : (
          todays.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              perspective="barber"
              actions={
                <AppointmentActions
                  appointment={a}
                  settings={settings}
                  onChanged={() => {
                    setError(null);
                    data.reload();
                  }}
                  onError={setError}
                />
              }
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Próximas citas</h2>
          <Link to="/barbero/agenda" className="text-xs text-muted hover:text-ink">
            Ver toda mi agenda
          </Link>
        </div>
        {!data.loading && upcoming.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={CalendarClock}
              title="Sin próximas citas"
              action={
                <Link to="/barbero/disponibilidad" className="text-sm text-accent hover:underline">
                  Revisa tu disponibilidad
                </Link>
              }
            />
          </div>
        ) : (
          upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} perspective="barber" />)
        )}
      </section>
    </>
  );
};
