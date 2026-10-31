import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { HttpError, notifyAppointment, sendReminders, type MailDeps, type OutgoingMail } from '../../server/appointmentMail.js';
import type { MailConfig } from '../../server/config.js';

/**
 * Correo de extremo a extremo contra el emulador de Firestore, con un buzón falso en lugar de
 * Gmail. El "token" de la prueba es el propio uid.
 */
const PROJECT = 'demo-adminsite';
const config: MailConfig = {
  serviceAccount: { projectId: PROJECT, clientEmail: 'test@test', privateKey: 'x' },
  gmailUser: 'barberia@test.co',
  gmailAppPassword: 'x',
  appUrl: 'https://app.test',
  studioName: 'XAC Barber Studio',
};

let db: Firestore;
let outbox: OutgoingMail[];
let failNext = false;

const deps = (): MailDeps => ({
  db,
  verifyIdToken: async (token) => {
    if (token === 'invalido') throw new Error('bad token');
    return token;
  },
  sendMail: async (mail) => {
    if (failNext) {
      failNext = false;
      throw new Error('smtp caído');
    }
    outbox.push(mail);
  },
});

const notify = (uid: string, appointmentId: string, event: string) =>
  notifyAppointment(config, { idToken: uid, appointmentId, event }, deps());

const recipients = () => outbox.map((m) => ({ subject: m.subject, bcc: m.bcc }));

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Ejecuta con npm run test:rules (emulador).');
  db = getFirestore(initializeApp({ projectId: PROJECT }, 'mail-test'));
});

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  outbox = [];
  failNext = false;
  const user = (uid: string, role: string, extra: Record<string, unknown> = {}) =>
    db.doc(`users/${uid}`).set({ email: `${uid}@test.co`, role, active: true, ...extra });
  await Promise.all([
    user('admin1', 'admin'),
    user('admin2', 'admin'),
    user('admin-off', 'admin', { active: false }),
    user('barber1', 'barber'),
    user('client1', 'client'),
    user('intruso', 'client'),
  ]);
  const appt = (id: string, extra: Record<string, unknown>) =>
    db.doc(`appointments/${id}`).set({
      clientId: 'client1', clientUserId: 'client1', barberUserId: 'barber1', clientName: 'Carlos', barberName: 'Juan',
      serviceName: 'Corte clásico', date: '2030-01-15', time: '10:00', status: 'pending', cancelReason: null, ...extra,
    });
  await appt('a1', {});
  await appt('a2', { date: '2030-01-16', status: 'confirmed' });
  await appt('a3', { date: '2030-01-16', status: 'cancelled' });
  await appt('walkin', { clientId: 'c-mostrador', clientUserId: null, date: '2030-01-16' });
  await db.doc('clients/c-mostrador').set({ fullName: 'Ana', email: 'ana@test.co' });
});

describe('correo por acción en la cita', () => {
  it('al reservar el cliente, avisa al barbero y a los admins activos, no al propio cliente', async () => {
    const { sent } = await notify('client1', 'a1', 'booked');
    expect(sent).toBe(3);
    expect(recipients()).toEqual([
      { subject: 'Nueva cita: Carlos · XAC Barber Studio', bcc: ['barber1@test.co'] },
      { subject: 'Nueva solicitud de cita: Carlos · XAC Barber Studio', bcc: ['admin1@test.co', 'admin2@test.co'] },
    ]);
    expect(outbox[0].to).toBe('barberia@test.co');
  });

  it('no repite el correo si la app avisa dos veces', async () => {
    await notify('client1', 'a1', 'booked');
    const second = await notify('client1', 'a1', 'booked');
    expect(second.sent).toBe(0);
    expect(outbox).toHaveLength(2);
  });

  it('al confirmar el barbero, el cliente recibe "Tu cita fue confirmada"', async () => {
    await db.doc('appointments/a1').update({ status: 'confirmed' });
    await notify('barber1', 'a1', 'status');
    expect(recipients()).toEqual([{ subject: '¡Tu cita fue confirmada! · XAC Barber Studio', bcc: ['client1@test.co'] }]);
  });

  it('usa el estado guardado, no el que diga el navegador', async () => {
    // La cita sigue pendiente: pedir "status" no envía una confirmación falsa.
    const { sent } = await notify('barber1', 'a1', 'status');
    expect(sent).toBe(0);
    expect(outbox).toHaveLength(0);
  });

  it('el cliente sin cuenta recibe el correo de su ficha', async () => {
    await notify('admin1', 'walkin', 'booked');
    expect(recipients()).toEqual([
      { subject: 'Recibimos tu solicitud de cita · XAC Barber Studio', bcc: ['ana@test.co'] },
      { subject: 'Nueva cita: Carlos · XAC Barber Studio', bcc: ['barber1@test.co'] },
    ]);
  });

  it('rechaza a quien no participa en la cita y tokens inválidos', async () => {
    await expect(notify('intruso', 'a1', 'booked')).rejects.toMatchObject({ status: 403 });
    await expect(notify('invalido', 'a1', 'booked')).rejects.toMatchObject({ status: 401 });
    await expect(notify('client1', 'no-existe', 'booked')).rejects.toMatchObject({ status: 404 });
    await expect(notify('client1', '../users/admin1', 'booked')).rejects.toBeInstanceOf(HttpError);
    await expect(notify('client1', 'a1', 'reminder')).rejects.toMatchObject({ status: 400 });
    expect(outbox).toHaveLength(0);
  });

  it('si Gmail falla, se puede reintentar', async () => {
    failNext = true;
    await expect(notify('client1', 'a1', 'booked')).rejects.toThrow('smtp caído');
    const retry = await notify('client1', 'a1', 'booked');
    expect(retry.sent).toBe(3);
  });
});

describe('recordatorio del día anterior', () => {
  it('solo a citas pendientes o confirmadas de esa fecha, una vez', async () => {
    const first = await sendReminders(config, '2030-01-16', deps());
    expect(first).toEqual({ appointments: 2, sent: 2 });
    expect(outbox.map((m) => m.bcc[0]).sort()).toEqual(['ana@test.co', 'client1@test.co']);
    expect(outbox[0].subject).toBe('Recordatorio: tu cita es mañana a las 10:00 · XAC Barber Studio');
    const again = await sendReminders(config, '2030-01-16', deps());
    expect(again.sent).toBe(0);
  });
});
