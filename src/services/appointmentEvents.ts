import { notificationsService } from './firebase/notifications.service';
import type { Actor } from './firebase/helpers';
import type { Appointment, AppointmentStatus } from '@/types/appointment.types';
import type { UserRole } from '@/types/auth.types';
import { formatLongDate } from '@/domain/time';

/**
 * Notificaciones dentro de la app tras operaciones de agenda, con un mensaje distinto para
 * cada perfil. Son "mejor esfuerzo": la cita ya quedó guardada. Quien hace la acción no se
 * notifica a sí mismo (lo filtra notificationsService).
 */
type Parties = { clientUserId: string | null; barberUserId: string | null };

const when = (a: Pick<Appointment, 'date' | 'time'>) => `${formatLongDate(a.date)} a las ${a.time}`;

/** Lo que hace un administrador no se le notifica a la propia administración. */
const toAdmins = (actorRole: UserRole, title: string, body: string, link: string, actor: Actor) =>
  actorRole === 'admin' ? Promise.resolve() : notificationsService.notifyAdmins({ title, body, link }, actor);

const toUser = (userId: string | null, title: string, body: string, link: string | null, actor: Actor) =>
  notificationsService.notify({ userIds: [userId], title, body, link }, actor);

const CLIENT_STATUS: Partial<Record<AppointmentStatus, (a: Appointment) => [string, string]>> = {
  confirmed: (a) => ['¡Tu cita fue confirmada!', `${a.serviceName} con ${a.barberName} el ${when(a)}. Te esperamos.`],
  completed: (a) => ['¡Gracias por tu visita!', `Tu ${a.serviceName} con ${a.barberName} quedó registrado.`],
  cancelled: (a) => ['Tu cita fue cancelada', `${a.serviceName} del ${when(a)}.${a.cancelReason ? ` Motivo: ${a.cancelReason}.` : ''} Puedes reservar de nuevo cuando quieras.`],
  no_show: (a) => ['Registramos tu inasistencia', `No asististe a ${a.serviceName} del ${when(a)}.`],
};

const BARBER_STATUS: Partial<Record<AppointmentStatus, (a: Appointment) => [string, string]>> = {
  confirmed: (a) => ['Cita confirmada', `${a.clientName} · ${a.serviceName} el ${when(a)}.`],
  cancelled: (a) => ['Cita cancelada', `${a.clientName} · ${a.serviceName} del ${when(a)}. El horario quedó libre.`],
};

export const appointmentEvents = {
  async booked(a: Appointment, parties: Parties, actor: Actor, actorRole: UserRole) {
    await toAdmins(
      actorRole,
      'Nueva solicitud de cita',
      `${a.clientName} pidió ${a.serviceName} con ${a.barberName} para el ${when(a)}.`,
      '/citas',
      actor
    );
    await toUser(parties.barberUserId, 'Nueva cita en tu agenda', `${a.clientName} · ${a.serviceName} el ${when(a)}.`, '/barbero/agenda', actor);
    await toUser(
      parties.clientUserId,
      a.status === 'confirmed' ? '¡Tu cita está confirmada!' : 'Recibimos tu solicitud de cita',
      `${a.serviceName} con ${a.barberName} el ${when(a)}.`,
      '/portal/citas',
      actor
    );
  },

  async statusChanged(a: Appointment, to: AppointmentStatus, parties: Parties, actor: Actor, actorRole: UserRole) {
    if (to === 'cancelled') {
      await toAdmins(actorRole, 'Cita cancelada', `${a.clientName} · ${a.serviceName} con ${a.barberName} el ${when(a)}.`, '/citas', actor);
    }
    if (to === 'completed') {
      await toAdmins(actorRole, 'Servicio listo para cobrar', `${a.barberName} finalizó ${a.serviceName} de ${a.clientName}.`, '/ventas', actor);
    }
    const client = CLIENT_STATUS[to]?.(a);
    if (client) await toUser(parties.clientUserId, client[0], client[1], '/portal/citas', actor);
    const barber = BARBER_STATUS[to]?.(a);
    if (barber) await toUser(parties.barberUserId, barber[0], barber[1], '/barbero/agenda', actor);
  },

  async rescheduled(a: Appointment, parties: Parties, actor: Actor, actorRole: UserRole) {
    await toAdmins(actorRole, 'Cita reprogramada', `${a.clientName} · ${a.serviceName} con ${a.barberName}, ahora el ${when(a)}.`, '/citas', actor);
    await toUser(parties.clientUserId, 'Tu cita fue reprogramada', `${a.serviceName} con ${a.barberName}, ahora el ${when(a)}.`, '/portal/citas', actor);
    await toUser(parties.barberUserId, 'Cita reprogramada', `${a.clientName} · ${a.serviceName}, ahora el ${when(a)}.`, '/barbero/agenda', actor);
  },
};
