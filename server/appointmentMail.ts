import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { MailConfig } from './config.js';
import {
  contentFor,
  deliveryKey,
  renderMail,
  type Audience,
  type AppointmentStatus,
  type MailAppointment,
  type MailEvent,
} from './emailTemplates.js';

/**
 * Lógica de correo independiente del hosting: los adaptadores (api/ en Vercel, o un servidor
 * Node en Hostinger) solo traducen la petición HTTP y llaman a estas funciones.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

export interface OutgoingMail {
  from: string;
  to: string;
  bcc: string[];
  subject: string;
  text: string;
  html: string;
}

/** Dependencias externas; en las pruebas se reemplazan por el emulador y un buzón falso. */
export interface MailDeps {
  db: Firestore;
  verifyIdToken: (token: string) => Promise<string>;
  sendMail: (mail: OutgoingMail) => Promise<void>;
}

/**
 * Verificación del ID token de Firebase con una librería JWT, según la guía oficial
 * ("Verify ID tokens using a third-party JWT library"). Se evita firebase-admin/auth porque
 * su dependencia jwks-rsa no carga en el runtime de Vercel.
 */
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export const verifyFirebaseIdToken = async (
  token: string,
  projectId: string,
  keys: Parameters<typeof jwtVerify>[1] = GOOGLE_JWKS
): Promise<string> => {
  const { payload } = await jwtVerify(token, keys, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  });
  const authTime = typeof payload.auth_time === 'number' ? payload.auth_time : Number.NaN;
  if (typeof payload.sub !== 'string' || !payload.sub || !(authTime <= Date.now() / 1000 + 300)) {
    throw new Error('invalid-token');
  }
  return payload.sub;
};

export const createDeps = (config: MailConfig): MailDeps => {
  const app = getApps().length > 0 ? getApp() : initializeApp({ credential: cert(config.serviceAccount) });
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });
  return {
    db: getFirestore(app),
    verifyIdToken: (token) => verifyFirebaseIdToken(token, config.serviceAccount.projectId),
    sendMail: async (mail) => {
      await transport.sendMail(mail);
    },
  };
};

interface StoredAppointment extends MailAppointment {
  id: string;
  clientId: string;
  clientUserId: string | null;
  barberUserId: string | null;
}

const text = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const textOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

const toStored = (id: string, d: Record<string, unknown>): StoredAppointment => ({
  id,
  clientId: text(d.clientId),
  clientUserId: textOrNull(d.clientUserId),
  barberUserId: textOrNull(d.barberUserId),
  clientName: text(d.clientName, 'Cliente'),
  barberName: text(d.barberName, 'tu barbero'),
  serviceName: text(d.serviceName, 'Servicio'),
  date: text(d.date),
  time: text(d.time),
  status: STATUSES.includes(d.status as AppointmentStatus) ? (d.status as AppointmentStatus) : 'pending',
  cancelReason: textOrNull(d.cancelReason),
});

const userEmail = async (db: Firestore, uid: string | null): Promise<string | null> => {
  if (!uid) return null;
  const snap = await db.doc(`users/${uid}`).get();
  const data = snap.data();
  return data && data.active !== false ? textOrNull(data.email) : null;
};

/** Correo del cliente: el de su cuenta o, si lo registró el admin sin cuenta, el de su ficha. */
const clientEmail = async (db: Firestore, a: StoredAppointment): Promise<string | null> =>
  (await userEmail(db, a.clientUserId)) ?? textOrNull((await db.doc(`clients/${a.clientId}`).get()).data()?.email);

const adminEmails = async (db: Firestore): Promise<string[]> => {
  const snap = await db.collection('users').where('role', '==', 'admin').get();
  return snap.docs
    .map((d) => d.data())
    .filter((d) => d.active !== false)
    .map((d) => textOrNull(d.email))
    .filter((e): e is string => Boolean(e));
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Envía los correos del evento una sola vez: reserva `mailLog/{clave}` con create(), que falla
 * si otro intento ya lo hizo. Si el envío falla, se borra la reserva para poder reintentar.
 */
const deliver = async (
  ctx: MailDeps,
  config: MailConfig,
  a: StoredAppointment,
  event: MailEvent,
  recipients: { audience: Audience; emails: string[] }[]
): Promise<number> => {
  const key = deliveryKey(a.id, event, a);
  const logRef = ctx.db.doc(`mailLog/${key}`);
  try {
    await logRef.create({ appointmentId: a.id, event: event.type, createdAt: Timestamp.now(), sent: 0 });
  } catch {
    return 0; // ya enviado (o en curso) por otra petición
  }

  let sent = 0;
  try {
    for (const { audience, emails } of recipients) {
      const content = contentFor(event, audience, a);
      const to = [...new Set(emails)].filter((e) => EMAIL_RE.test(e));
      if (!content || to.length === 0) continue;
      const mail = renderMail(content, config.studioName, config.appUrl);
      // Copia oculta: los destinatarios no ven los correos de los demás.
      await ctx.sendMail({
        from: `"${config.studioName}" <${config.gmailUser}>`,
        to: config.gmailUser,
        bcc: to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      sent += to.length;
    }
  } catch (err) {
    await logRef.delete().catch(() => undefined);
    throw err;
  }
  await logRef.update({ sent });
  return sent;
};

export type NotifyEvent = 'booked' | 'status' | 'rescheduled';

/**
 * Correo tras una acción en la app. Quien llama debe ser participante de la cita; el contenido
 * se arma con los datos guardados en Firestore, no con lo que manda el navegador.
 */
export const notifyAppointment = async (
  config: MailConfig,
  input: { idToken: string; appointmentId: unknown; event: unknown },
  ctx: MailDeps = createDeps(config)
): Promise<{ sent: number }> => {
  if (typeof input.appointmentId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(input.appointmentId)) {
    throw new HttpError(400, 'Cita inválida.');
  }
  if (input.event !== 'booked' && input.event !== 'status' && input.event !== 'rescheduled') {
    throw new HttpError(400, 'Evento inválido.');
  }

  let uid: string;
  try {
    uid = await ctx.verifyIdToken(input.idToken);
  } catch {
    throw new HttpError(401, 'Sesión inválida.');
  }

  const [apptSnap, callerSnap] = await Promise.all([
    ctx.db.doc(`appointments/${input.appointmentId}`).get(),
    ctx.db.doc(`users/${uid}`).get(),
  ]);
  if (!apptSnap.exists) throw new HttpError(404, 'La cita no existe.');
  const caller = callerSnap.data();
  if (!caller || caller.active === false) throw new HttpError(403, 'Sin permiso.');
  const a = toStored(apptSnap.id, apptSnap.data() ?? {});
  const isAdmin = caller.role === 'admin';
  if (!isAdmin && uid !== a.clientUserId && uid !== a.barberUserId) throw new HttpError(403, 'Sin permiso.');

  const event: MailEvent = input.event === 'status' ? { type: 'status', status: a.status } : { type: input.event };

  // Nadie recibe correo de su propia acción; la administración no se avisa a sí misma.
  const client = uid === a.clientUserId ? [] : [await clientEmail(ctx.db, a)].filter((e): e is string => Boolean(e));
  const barber = uid === a.barberUserId ? [] : [await userEmail(ctx.db, a.barberUserId)].filter((e): e is string => Boolean(e));
  const admins = isAdmin ? [] : await adminEmails(ctx.db);

  const sent = await deliver(ctx, config, a, event, [
    { audience: 'client', emails: client },
    { audience: 'barber', emails: barber },
    { audience: 'admin', emails: admins },
  ]);
  return { sent };
};

/** Recordatorio del día anterior para las citas pendientes o confirmadas de `date`. */
export const sendReminders = async (
  config: MailConfig,
  date: string,
  ctx: MailDeps = createDeps(config)
): Promise<{ appointments: number; sent: number }> => {
  // Solo filtro de igualdad: no requiere índice compuesto. El estado se filtra aquí.
  const snap = await ctx.db.collection('appointments').where('date', '==', date).get();
  const due = snap.docs.map((d) => toStored(d.id, d.data())).filter((a) => a.status === 'pending' || a.status === 'confirmed');
  let sent = 0;
  for (const a of due) {
    const email = await clientEmail(ctx.db, a);
    if (!email) continue;
    try {
      sent += await deliver(ctx, config, a, { type: 'reminder' }, [{ audience: 'client', emails: [email] }]);
    } catch (err) {
      console.error(`Recordatorio de ${a.id} no enviado:`, err instanceof Error ? err.message : 'error');
    }
  }
  return { appointments: due.length, sent };
};

/** Fecha de mañana en la zona del negocio (Bogotá, UTC-5 sin horario de verano). */
export const tomorrowInBogota = (now = new Date()): string => {
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  bogota.setUTCDate(bogota.getUTCDate() + 1);
  return bogota.toISOString().slice(0, 10);
};
