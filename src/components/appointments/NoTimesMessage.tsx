import React from 'react';
import { CalendarX } from 'lucide-react';
import { EmptyState } from '@/components/common/Feedback';
import { hasWorkingDays } from '@/domain/availability';
import type { Barber } from '@/types/barber.types';

/** Explica por qué no hay horarios: falta de jornada configurada o agenda llena ese día. */
export const NoTimesMessage: React.FC<{ barbers: Barber[] }> = ({ barbers }) => {
  const withoutSchedule = barbers.filter((b) => !hasWorkingDays(b.schedule));
  if (barbers.length > 0 && withoutSchedule.length === barbers.length) {
    return (
      <EmptyState
        icon={CalendarX}
        title={barbers.length === 1 ? `${barbers[0].fullName} aún no tiene horario configurado` : 'Ningún barbero tiene horario configurado'}
        description="El estudio debe definir la jornada en Barberos › Horario (o el barbero en Mi disponibilidad)."
      />
    );
  }
  return <EmptyState icon={CalendarX} title="No hay horarios disponibles ese día" description="Prueba otra fecha u otro barbero." />;
};
