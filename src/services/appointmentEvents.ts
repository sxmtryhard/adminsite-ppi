import { notificationsService } from './firebase/notifications.service';
import { requestEmail } from './emailNotify';
import type { Actor } from './firebase/helpers';
import type { Appointment, AppointmentStatus } from '@/types/appointment.types';
import type { UserRole } from '@/types/auth.types';
import { formatLongDate } from '@/domain/time';

/**
 * Notificaciones tras operaciones de agenda, con un mensaje distinto para cada perfil: dentro
 * de la app (campana) y por correo (lo arma y envía el servidor). Son "mejor esfuerzo": la cita
 * ya quedó guardada. Quien hace la acción no se notifica a sí mismo.
 */
type Parties = { clientUserId: string | null; barberUserId: string | null };

const when = (a: Pick<Appointment, 'date' | 'time'>) => `${formatLongDate(a.date)} a las ${a.time}`;

/** Lo que hace un administrador no se le notifica a la propia administración. */
const toAdmins = (a: Appointment, actorRole: UserRole, title: string, body: string, link: string, actor: Actor) =>
  actorRole === 'admin' ? Promise.resolve() : notificationsService.notifyAdmins({ title, body, link, appointmentId: a.id }, actor);

const toUser = (a: Appointment, userId: string | null, title: string, body: string, link: string | null, actor: Actor) =>
  notificationsService.notify({ userIds: [userId], title, body, link, appointmentId: a.id }, actor);

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
    void requestEmail(a.id, 'booked');
    await toAdmins(
      a,
      actorRole,
      'Nueva solicitud de cita',
      `${a.clientName} pidió ${a.serviceName} con ${a.barberName} para el ${when(a)}.`,
      '/citas',
      actor
    );
    await toUser(a, parties.barberUserId, 'Nueva cita en tu agenda', `${a.clientName} · ${a.serviceName} el ${when(a)}.`, '/barbero/agenda', actor);
    await toUser(
      a,
      parties.clientUserId,
      a.status === 'confirmed' ? '¡Tu cita está confirmada!' : 'Recibimos tu solicitud de cita',
      `${a.serviceName} con ${a.barberName} el ${when(a)}.`,
      '/portal/citas',
      actor
    );
  },

  async statusChanged(a: Appointment, to: AppointmentStatus, parties: Parties, actor: Actor, actorRole: UserRole) {
    if (to === 'confirmed' || to === 'cancelled') void requestEmail(a.id, 'status');
    if (to === 'cancelled') {
      await toAdmins(a, actorRole, 'Cita cancelada', `${a.clientName} · ${a.serviceName} con ${a.barberName} el ${when(a)}.`, '/citas', actor);
    }
    if (to === 'completed') {
      await toAdmins(a, actorRole, 'Servicio listo para cobrar', `${a.barberName} finalizó ${a.serviceName} de ${a.clientName}.`, '/ventas', actor);
    }
    const client = CLIENT_STATUS[to]?.(a);
    if (client) await toUser(a, parties.clientUserId, client[0], client[1], '/portal/citas', actor);
    const barber = BARBER_STATUS[to]?.(a);
    if (barber) await toUser(a, parties.barberUserId, barber[0], barber[1], '/barbero/agenda', actor);
  },

  async rescheduled(a: Appointment, parties: Parties, actor: Actor, actorRole: UserRole) {
    void requestEmail(a.id, 'rescheduled');
    await toAdmins(a, actorRole, 'Cita reprogramada', `${a.clientName} · ${a.serviceName} con ${a.barberName}, ahora el ${when(a)}.`, '/citas', actor);
    await toUser(a, parties.clientUserId, 'Tu cita fue reprogramada', `${a.serviceName} con ${a.barberName}, ahora el ${when(a)}.`, '/portal/citas', actor);
    await toUser(a, parties.barberUserId, 'Cita reprogramada', `${a.clientName} · ${a.serviceName}, ahora el ${when(a)}.`, '/barbero/agenda', actor);
  },
};
