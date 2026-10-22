import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, ClipboardList, ShoppingBag } from 'lucide-react';
import { Alert, Spinner } from '@/components/common/Feedback';
import { VerifyEmailBanner } from '@/components/common/VerifyEmailBanner';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { ACTIVE_STATUSES } from '@/domain/appointmentStatus';
import { businessDate } from '@/domain/time';

export const PortalHomePage: React.FC = () => {
  const { user } = useSession();
  const today = businessDate();
  const appts = useAsync(() => appointmentsService.listForClient(user.uid), [user.uid]);
  const next = (appts.data ?? []).find((a) => a.date >= today && ACTIVE_STATUSES.includes(a.status));

  return (
    <>
      <VerifyEmailBanner />
      <section className="card relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/25 blur-3xl" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-subtle">XAC Barber Studio</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Hola, {user.displayName.split(' ')[0]}.</h1>
        <p className="mt-1 max-w-md text-sm text-muted">Reserva tu próximo corte en segundos, con el barbero que prefieras y en un horario realmente disponible.</p>
        <Link
          to="/portal/reservar"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-br from-accent to-accent-strong px-6 text-sm font-medium text-white shadow-[0_8px_30px_rgba(79,70,229,0.4)] transition hover:brightness-110"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden /> Reservar cita
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Tu próxima cita</h2>
        {appts.error && <Alert>{appts.error}</Alert>}
        {appts.loading ? (
          <Spinner />
        ) : next ? (
          <AppointmentCard appointment={next} perspective="client" />
        ) : (
          <p className="card p-5 text-sm text-muted">No tienes citas próximas.</p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/portal/citas" className="card flex items-center gap-4 p-5 transition hover:border-accent/50">
          <ClipboardList className="h-6 w-6 text-accent" aria-hidden />
          <div>
            <p className="font-medium text-ink">Mis citas</p>
            <p className="text-sm text-muted">Cancela o reprograma según la política</p>
          </div>
        </Link>
        <Link to="/portal/catalogo" className="card flex items-center gap-4 p-5 transition hover:border-accent/50">
          <ShoppingBag className="h-6 w-6 text-accent" aria-hidden />
          <div>
            <p className="font-medium text-ink">Catálogo</p>
            <p className="text-sm text-muted">Servicios y productos con precios</p>
          </div>
        </Link>
      </div>
    </>
  );
};
