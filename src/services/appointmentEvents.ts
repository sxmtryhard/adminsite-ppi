import { notificationsService } from './firebase/notifications.service';
import type { Actor } from './firebase/helpers';
import type { Appointment, AppointmentStatus } from '@/types/appointment.types';
import type { UserRole } from '@/types/auth.types';
import { STATUS_LABELS } from '@/domain/appointmentStatus';
import { formatLongDate } from '@/domain/time';

/**
 * Notificaciones dentro de la app tras operaciones de agenda. Son "mejor esfuerzo":
 * la cita ya quedó guardada; si la notificación falla se informa al llamador.
 */
const when = (a: Pick<Appointment, 'date' | 'time'>) => `${formatLongDate(a.date)} a las ${a.time}`;

/** Lo que hace un administrador no se le notifica a la propia administración. */
const toAdmins = (actorRole: UserRole, title: string, body: string, actor: Actor) =>
  actorRole === 'admin' ? Promise.resolve() : notificationsService.notifyAdmins({ title, body, link: '/citas' }, actor);

export const appointmentEvents = {
  async booked(
    a: Appointment,
    parties: { clientUserId: string | null; barberUserId: string | null },
    actor: Actor,
    actorRole: UserRole
  ) {
    await toAdmins(actorRole, 'Nueva reserva', `${a.clientName} reservó ${a.serviceName} con ${a.barberName} el ${when(a)}.`, actor);
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
    actor: Actor,
    actorRole: UserRole
  ) {
    if (to === 'cancelled') {
      await toAdmins(actorRole, 'Cita cancelada', `${a.clientName} · ${a.serviceName} con ${a.barberName} el ${when(a)}.`, actor);
    }
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

  async rescheduled(
    a: Appointment,
    parties: { clientUserId: string | null; barberUserId: string | null },
    actor: Actor,
    actorRole: UserRole
  ) {
    await toAdmins(actorRole, 'Cita reprogramada', `${a.clientName} · ${a.serviceName} con ${a.barberName}, ahora el ${when(a)}.`, actor);
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
