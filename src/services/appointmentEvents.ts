import { notificationsService } from './firebase/notifications.service';
import type { Actor } from './firebase/helpers';
import type { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { STATUS_LABELS } from '@/domain/appointmentStatus';
import { formatLongDate } from '@/domain/time';

/**
 * Notificaciones dentro de la app tras operaciones de agenda. Son "mejor esfuerzo":
 * la cita ya quedó guardada; si la notificación falla se informa al llamador.
 */
const when = (a: Pick<Appointment, 'date' | 'time'>) => `${formatLongDate(a.date)} a las ${a.time}`;

export const appointmentEvents = {
  async booked(a: Appointment, parties: { clientUserId: string | null; barberUserId: string | null }, actor: Actor) {
    await notificationsService.notify(
      {
        userIds: [parties.barberUserId],
        title: 'Nueva reserva',
        body: `${a.clientName} reservó ${a.serviceName} el ${when(a)}.`,
        link: '/barbero/agenda',
      },
      actor
    );
    await notificationsService.notify(
      {
        userIds: [parties.clientUserId],
        title: 'Reserva registrada',
        body: `${a.serviceName} con ${a.barberName} el ${when(a)}. Estado: ${STATUS_LABELS[a.status]}.`,
        link: '/portal/citas',
      },
      actor
    );
  },

  async statusChanged(
    a: Appointment,
    to: AppointmentStatus,
    parties: { clientUserId: string | null; barberUserId: string | null },
    actor: Actor
  ) {
    await notificationsService.notify(
      {
        userIds: [parties.clientUserId, parties.barberUserId],
        title: `Cita ${STATUS_LABELS[to].toLowerCase()}`,
        body: `${a.serviceName} del ${when(a)} (${a.clientName} con ${a.barberName}).`,
        link: null,
      },
      actor
    );
  },

  async rescheduled(a: Appointment, parties: { clientUserId: string | null; barberUserId: string | null }, actor: Actor) {
    await notificationsService.notify(
      {
        userIds: [parties.clientUserId, parties.barberUserId],
        title: 'Cita reprogramada',
        body: `${a.serviceName} (${a.clientName} con ${a.barberName}) ahora es el ${when(a)}.`,
        link: null,
      },
      actor
    );
  },
};
