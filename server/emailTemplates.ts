/**
 * Plantillas de correo. Funciones puras (sin Firebase ni red) para poder probarlas.
 * Todo dato que viene de Firestore se escapa antes de insertarlo en el HTML.
 */
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface MailAppointment {
  clientName: string;
  barberName: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  cancelReason: string | null;
}

export type Audience = 'client' | 'barber' | 'admin';
export type MailEvent = { type: 'booked' } | { type: 'status'; status: AppointmentStatus } | { type: 'rescheduled' } | { type: 'reminder' };

export interface Mail {
  subject: string;
  text: string;
  html: string;
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const longDate = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${d} de ${MONTHS[m - 1]}`;
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

interface Content {
  subject: string;
  heading: string;
  lines: string[];
  cta?: { label: string; path: string };
}

const when = (a: MailAppointment) => `${longDate(a.date)} a las ${a.time}`;

/** Qué recibe cada perfil en cada evento. `null` = ese perfil no recibe correo. */
export const contentFor = (event: MailEvent, audience: Audience, a: MailAppointment): Content | null => {
  const detail = `${a.serviceName} con ${a.barberName}, el ${when(a)}.`;
  const myAppointments = { label: 'Ver mis citas', path: '/portal/citas' };
  const agenda = { label: 'Abrir mi agenda', path: '/barbero/agenda' };
  const admin = { label: 'Abrir la agenda', path: '/citas' };

  switch (event.type) {
    case 'booked':
      if (audience === 'client') {
        return a.status === 'confirmed'
          ? { subject: '¡Tu cita está confirmada!', heading: '¡Tu cita está confirmada!', lines: [detail, 'Te esperamos.'], cta: myAppointments }
          : { subject: 'Recibimos tu solicitud de cita', heading: 'Recibimos tu solicitud', lines: [detail, 'Te avisaremos cuando la barbería la confirme.'], cta: myAppointments };
      }
      if (audience === 'barber') {
        return { subject: `Nueva cita: ${a.clientName}`, heading: 'Nueva cita en tu agenda', lines: [`${a.clientName} · ${detail}`], cta: agenda };
      }
      return { subject: `Nueva solicitud de cita: ${a.clientName}`, heading: 'Nueva solicitud de cita', lines: [`${a.clientName} pidió ${detail}`], cta: admin };

    case 'status':
      if (event.status === 'confirmed' && audience === 'client') {
        return { subject: '¡Tu cita fue confirmada!', heading: '¡Tu cita fue confirmada!', lines: [detail, 'Te esperamos.'], cta: myAppointments };
      }
      if (event.status === 'cancelled') {
        const reason = a.cancelReason ? `Motivo: ${a.cancelReason}.` : '';
        if (audience === 'client') {
          return { subject: 'Tu cita fue cancelada', heading: 'Tu cita fue cancelada', lines: [detail, reason, 'Puedes reservar de nuevo cuando quieras.'].filter(Boolean), cta: { label: 'Reservar de nuevo', path: '/portal/reservar' } };
        }
        if (audience === 'barber') {
          return { subject: `Cita cancelada: ${a.clientName}`, heading: 'Cita cancelada', lines: [`${a.clientName} · ${detail}`, 'El horario quedó libre.'], cta: agenda };
        }
        return { subject: `Cita cancelada: ${a.clientName}`, heading: 'Cita cancelada', lines: [`${a.clientName} · ${detail}`, reason].filter(Boolean), cta: admin };
      }
      return null;

    case 'rescheduled':
      if (audience === 'client') {
        return { subject: 'Tu cita fue reprogramada', heading: 'Tu cita fue reprogramada', lines: [`Nueva fecha: ${detail}`], cta: myAppointments };
      }
      if (audience === 'barber') {
        return { subject: `Cita reprogramada: ${a.clientName}`, heading: 'Cita reprogramada', lines: [`${a.clientName} · ahora ${detail}`], cta: agenda };
      }
      return null;

    case 'reminder':
      if (audience !== 'client') return null;
      return {
        subject: `Recordatorio: tu cita es mañana a las ${a.time}`,
        heading: 'Tu cita es mañana',
        lines: [detail, 'Si no puedes asistir, cancélala o reprográmala desde la app para liberar el horario.'],
        cta: myAppointments,
      };
  }
};

export const renderMail = (content: Content, studioName: string, appUrl: string): Mail => {
  const lines = content.lines.map((l) => `<p style="margin:0 0 12px;color:#333;font-size:15px;line-height:1.5">${escapeHtml(l)}</p>`).join('');
  const cta = content.cta
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(appUrl + content.cta.path)}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;font-size:14px;display:inline-block">${escapeHtml(content.cta.label)}</a></p>`
    : '';
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f4f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#888">${escapeHtml(studioName)}</p>
<h1 style="margin:0 0 20px;font-size:22px;color:#111">${escapeHtml(content.heading)}</h1>
${lines}${cta}
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#999">Recibes este correo porque tienes una cita en ${escapeHtml(studioName)}.</p>
</td></tr></table></body></html>`;
  const text = [content.heading, '', ...content.lines, ...(content.cta ? ['', `${content.cta.label}: ${appUrl}${content.cta.path}`] : [])].join('\n');
  return { subject: `${content.subject} · ${studioName}`, text, html };
};

/** Clave única por correo: evita duplicados si la app reintenta o dos pestañas avisan. */
export const deliveryKey = (appointmentId: string, event: MailEvent, a: Pick<MailAppointment, 'date' | 'time'>): string => {
  switch (event.type) {
    case 'booked':
      return `${appointmentId}_booked`;
    case 'status':
      return `${appointmentId}_status_${event.status}`;
    case 'rescheduled':
      return `${appointmentId}_rescheduled_${a.date}_${a.time.replace(':', '')}`;
    case 'reminder':
      return `${appointmentId}_reminder_${a.date}`;
  }
};
