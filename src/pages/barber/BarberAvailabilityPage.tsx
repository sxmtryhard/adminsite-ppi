import React from 'react';
import { Card, PageHeader } from '@/components/common/Layout';
import { Alert, Spinner } from '@/components/common/Feedback';
import { ScheduleEditor } from '@/components/barbers/ScheduleEditor';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { barbersService } from '@/services/firebase/barbers.service';

/** El barbero gestiona su propia jornada y ausencias (las reglas solo le permiten esos campos). */
export const BarberAvailabilityPage: React.FC = () => {
  const { user } = useSession();
  const barber = useAsync(() => (user.barberId ? barbersService.getBarber(user.barberId) : Promise.resolve(null)), [user.barberId]);

  if (!user.barberId) return <Alert tone="warning">Tu cuenta no está vinculada a un barbero.</Alert>;

  return (
    <>
      <PageHeader title="Mi disponibilidad" description="Define tu jornada semanal, descansos y días libres. Los clientes solo verán horarios dentro de ella." />
      {barber.error && <Alert>{barber.error}</Alert>}
      <Card>
        {barber.loading || !barber.data ? (
          <Spinner />
        ) : (
          <ScheduleEditor
            initialSchedule={barber.data.schedule}
            initialBlocked={barber.data.blockedDates}
            onSave={(schedule, blocked) => barbersService.updateAvailability(user.barberId as string, schedule, blocked)}
          />
        )}
      </Card>
    </>
  );
};
