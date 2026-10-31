import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

/**
 * Pruebas de las reglas de seguridad. Cada caso simula a un usuario real (o a un atacante con
 * el SDK) escribiendo directamente en Firestore, sin pasar por la interfaz.
 */
let env: RulesTestEnvironment;

const ADMIN = 'admin-uid';
const BARBER = 'barber-uid';
const BARBER2 = 'barber2-uid';
const CLIENT = 'client-uid';
const OTHER = 'other-client-uid';
const UNVERIFIED = 'unverified-uid';

const DATE = '2030-01-15';
/** 10:00 en Bogotá (UTC-5). */
const START = Timestamp.fromDate(new Date('2030-01-15T15:00:00Z'));

const as = (uid: string, verified = true): Firestore =>
  env.authenticatedContext(uid, { email: `${uid}@test.co`, email_verified: verified }).firestore() as unknown as Firestore;
const anon = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;

const slotId = (barberId: string, date: string, hhmm: string) => `${barberId}_${date}_${hhmm}`;

const appointment = (over: Record<string, unknown> = {}) => ({
  clientId: CLIENT,
  clientName: 'Cliente Uno',
  clientPhone: '3001234567',
  barberId: 'b1',
  barberName: 'Juan Manco',
  serviceId: 's30',
  serviceName: 'Corte clásico',
  servicePrice: 20000,
  durationMinutes: 30,
  date: DATE,
  time: '10:00',
  notes: '',
  startAt: START,
  slotIds: [slotId('b1', DATE, '1000'), slotId('b1', DATE, '1015')],
  status: 'pending',
  saleId: null,
  cancelReason: null,
  clientUserId: CLIENT,
  barberUserId: BARBER,
  createdBy: CLIENT,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
});

/** Escribe la cita y las franjas indicadas en un solo lote, como hace la app. */
const book = (db: Firestore, id: string, data: Record<string, unknown>, slots = data.slotIds as string[]) => {
  const batch = writeBatch(db);
  batch.set(doc(db, 'appointments', id), data);
  for (const s of slots) {
    batch.set(doc(db, 'slots', s), { appointmentId: id, barberId: data.barberId, date: data.date });
  }
  return batch.commit();
};

const notification = (over: Record<string, unknown> = {}) => ({
  userId: BARBER,
  audience: null,
  title: 'Nueva cita en tu agenda',
  body: 'Cliente Uno · Corte clásico',
  link: '/barbero/agenda',
  read: false,
  actorUid: CLIENT,
  appointmentId: 'existing',
  createdAt: serverTimestamp(),
  ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-adminsite',
    firestore: { rules: readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx: RulesTestContext) => {
    const db = ctx.firestore() as unknown as Firestore;
    const user = (uid: string, role: string, extra: Record<string, unknown> = {}) =>
      setDoc(doc(db, 'users', uid), { email: `${uid}@test.co`, displayName: uid, role, phone: '', barberId: null, active: true, ...extra });
    await user(ADMIN, 'admin');
    await user(BARBER, 'barber', { barberId: 'b1' });
    await user(BARBER2, 'barber', { barberId: 'b2' });
    await user(CLIENT, 'client');
    await user(OTHER, 'client');
    await user(UNVERIFIED, 'client');
    await setDoc(doc(db, 'barbers', 'b1'), { fullName: 'Juan Manco', status: 'active', userId: BARBER, schedule: {}, blockedDates: [] });
    await setDoc(doc(db, 'barbers', 'b2'), { fullName: 'Pedro', status: 'active', userId: BARBER2, schedule: {}, blockedDates: [] });
    await setDoc(doc(db, 'services', 's30'), { name: 'Corte clásico', price: 20000, durationMinutes: 30, status: 'active' });
    await setDoc(doc(db, 'services', 's60'), { name: 'Premium', price: 45000, durationMinutes: 60, status: 'active' });
    await setDoc(doc(db, 'serviceCosts', 's30'), { directCost: 5000 });
    await setDoc(doc(db, 'barberPrivate', 'b1'), { phone: '300', commissionRate: 40 });
    await setDoc(doc(db, 'config', 'business'), { cancellationMinHours: 3, minLeadMinutes: 60, bookingWindowDays: 30 });
    await setDoc(doc(db, 'expenses', 'e1'), { amount: 100000, status: 'active', date: DATE, createdBy: ADMIN });
    await setDoc(doc(db, 'auditLogs', 'l1'), { action: 'sale.created', actorUid: ADMIN });
    await setDoc(doc(db, 'appointments', 'existing'), appointment({ time: '12:00', slotIds: [slotId('b1', DATE, '1200'), slotId('b1', DATE, '1215')] }));
    await setDoc(doc(db, 'appointments', 'other-barber'), appointment({ barberId: 'b2', barberName: 'Pedro', barberUserId: BARBER2, clientId: OTHER, clientUserId: OTHER }));
  });
});

describe('roles y perfiles', () => {
  it('nadie puede registrarse como administrador', async () => {
    await assertFails(
      setDoc(doc(as('nuevo'), 'users', 'nuevo'), {
        email: 'nuevo@test.co', displayName: 'Nuevo', role: 'admin', phone: '', barberId: null, active: true, createdAt: serverTimestamp(),
      })
    );
  });

  it('el registro público crea solo clientes', async () => {
    await assertSucceeds(
      setDoc(doc(as('nuevo'), 'users', 'nuevo'), {
        email: 'nuevo@test.co', displayName: 'Nuevo', role: 'client', phone: '', barberId: null, active: true, createdAt: serverTimestamp(),
      })
    );
  });

  it('un cliente no puede cambiarse el rol ni activarse', async () => {
    await assertFails(updateDoc(doc(as(CLIENT), 'users', CLIENT), { role: 'admin' }));
    await assertFails(updateDoc(doc(as(CLIENT), 'users', CLIENT), { barberId: 'b1' }));
  });

  it('un cliente no puede leer el perfil de otro', async () => {
    await assertFails(getDoc(doc(as(CLIENT), 'users', OTHER)));
  });

  it('el admin cambia roles de otros, pero no el suyo', async () => {
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'users', OTHER), { role: 'barber' }));
    await assertFails(updateDoc(doc(as(ADMIN), 'users', ADMIN), { role: 'client' }));
  });
});

describe('datos privados', () => {
  it('cliente y barbero no ven costos, gastos ni auditoría', async () => {
    for (const uid of [CLIENT, BARBER]) {
      await assertFails(getDoc(doc(as(uid), 'serviceCosts', 's30')));
      await assertFails(getDoc(doc(as(uid), 'expenses', 'e1')));
      await assertFails(getDoc(doc(as(uid), 'auditLogs', 'l1')));
    }
    await assertSucceeds(getDoc(doc(as(ADMIN), 'serviceCosts', 's30')));
  });

  it('el barbero solo ve sus datos privados y sus citas', async () => {
    await assertSucceeds(getDoc(doc(as(BARBER), 'barberPrivate', 'b1')));
    await assertFails(getDoc(doc(as(BARBER2), 'barberPrivate', 'b1')));
    await assertSucceeds(getDoc(doc(as(BARBER), 'appointments', 'existing')));
    await assertFails(getDoc(doc(as(BARBER), 'appointments', 'other-barber')));
  });

  it('un cliente no ve citas de otros, ni listándolas', async () => {
    await assertFails(getDoc(doc(as(CLIENT), 'appointments', 'other-barber')));
    await assertFails(getDocs(collection(as(CLIENT), 'appointments')));
    await assertSucceeds(getDocs(query(collection(as(CLIENT), 'appointments'), where('clientId', '==', CLIENT))));
  });

  it('sin sesión solo se lee el logo', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'branding', 'current')));
    await assertFails(getDoc(doc(anon(), 'barbers', 'b1')));
    await assertFails(getDoc(doc(anon(), 'services', 's30')));
  });
});

describe('reservas', () => {
  it('un cliente verificado reserva una hora libre', async () => {
    await assertSucceeds(book(as(CLIENT), 'a1', appointment()));
  });

  it('una cita de 60 min bloquea sus 4 franjas', async () => {
    const slots = ['1000', '1015', '1030', '1045'].map((h) => slotId('b1', DATE, h));
    await assertSucceeds(
      book(as(CLIENT), 'a60', appointment({ serviceId: 's60', serviceName: 'Premium', servicePrice: 45000, durationMinutes: 60, slotIds: slots }))
    );
  });

  it('rechaza la doble reserva de la misma franja', async () => {
    await assertSucceeds(book(as(CLIENT), 'a1', appointment()));
    await assertFails(book(as(OTHER), 'a2', appointment({ clientId: OTHER, clientUserId: OTHER, createdBy: OTHER })));
  });

  it('rechaza una reserva que se cruza a la mitad con otra', async () => {
    await assertSucceeds(book(as(CLIENT), 'a1', appointment()));
    // 09:45 de 30 min ocupa 09:45 y 10:00 (ya tomada).
    await assertFails(
      book(as(OTHER), 'a2', appointment({
        clientId: OTHER, clientUserId: OTHER, createdBy: OTHER, time: '09:45',
        startAt: Timestamp.fromDate(new Date('2030-01-15T14:45:00Z')),
        slotIds: [slotId('b1', DATE, '0945'), slotId('b1', DATE, '1000')],
      }))
    );
  });

  it('rechaza una cita larga que deja franjas intermedias sin bloquear', async () => {
    const slots = ['1000', '1015', '1030', '1045'].map((h) => slotId('b1', DATE, h));
    await assertFails(
      book(
        as(CLIENT),
        'gap',
        appointment({ serviceId: 's60', serviceName: 'Premium', servicePrice: 45000, durationMinutes: 60, slotIds: slots }),
        [slots[0], slots[3]]
      )
    );
  });

  it('rechaza una lista de franjas que no corresponde a la hora', async () => {
    const slots = [slotId('b1', DATE, '1000'), slotId('b1', DATE, '1100')];
    await assertFails(book(as(CLIENT), 'bad', appointment({ slotIds: slots })));
  });

  it('rechaza precio, nombre de servicio o duración alterados', async () => {
    await assertFails(book(as(CLIENT), 'p1', appointment({ servicePrice: 1000 })));
    await assertFails(book(as(CLIENT), 'p2', appointment({ serviceName: 'Corte gratis' })));
    await assertFails(book(as(CLIENT), 'p3', appointment({ durationMinutes: 15, slotIds: [slotId('b1', DATE, '1000')] })));
  });

  it('rechaza reservar a nombre de otro cliente o con la cita ya confirmada', async () => {
    await assertFails(book(as(CLIENT), 'x1', appointment({ clientId: OTHER, clientUserId: OTHER })));
    await assertFails(book(as(CLIENT), 'x2', appointment({ status: 'confirmed' })));
  });

  it('rechaza destinatarios de avisos falsos en la cita', async () => {
    await assertFails(book(as(CLIENT), 'x3', appointment({ barberUserId: OTHER })));
    await assertFails(book(as(CLIENT), 'x4', appointment({ clientUserId: ADMIN })));
  });

  it('exige correo verificado para reservar', async () => {
    await assertFails(
      book(as(UNVERIFIED, false), 'u1', appointment({ clientId: UNVERIFIED, clientUserId: UNVERIFIED, createdBy: UNVERIFIED }))
    );
  });

  it('rechaza campos extra en la cita', async () => {
    await assertFails(book(as(CLIENT), 'x5', appointment({ discount: 100 })));
  });
});

describe('estados de la cita', () => {
  it('el cliente no puede confirmar su propia cita', async () => {
    await assertFails(updateDoc(doc(as(CLIENT), 'appointments', 'existing'), { status: 'confirmed', updatedAt: serverTimestamp() }));
  });

  it('el barbero asignado confirma; otro barbero no', async () => {
    await assertFails(updateDoc(doc(as(BARBER2), 'appointments', 'existing'), { status: 'confirmed', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as(BARBER), 'appointments', 'existing'), { status: 'confirmed', updatedAt: serverTimestamp() }));
  });

  it('no se puede saltar de pendiente a completada', async () => {
    await assertFails(updateDoc(doc(as(ADMIN), 'appointments', 'existing'), { status: 'completed', updatedAt: serverTimestamp() }));
  });

  it('el cliente cancela con antelación, pero no a última hora', async () => {
    await assertSucceeds(
      updateDoc(doc(as(CLIENT), 'appointments', 'existing'), { status: 'cancelled', cancelReason: 'Viaje', updatedAt: serverTimestamp() })
    );
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      await setDoc(doc(db, 'appointments', 'soon'), appointment({ startAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000) }));
    });
    await assertFails(
      updateDoc(doc(as(CLIENT), 'appointments', 'soon'), { status: 'cancelled', cancelReason: null, updatedAt: serverTimestamp() })
    );
  });

  it('el barbero cancela y libera las franjas en la misma operación', async () => {
    await assertSucceeds(book(as(CLIENT), 'a1', appointment()));
    const db = as(BARBER);
    const batch = writeBatch(db);
    batch.update(doc(db, 'appointments', 'a1'), { status: 'cancelled', cancelReason: null, updatedAt: serverTimestamp() });
    for (const s of appointment().slotIds) batch.delete(doc(db, 'slots', s));
    await assertSucceeds(batch.commit());
  });

  it('no se puede liberar la franja de una cita activa', async () => {
    await assertSucceeds(book(as(CLIENT), 'a1', appointment()));
    await assertFails(deleteDoc(doc(as(OTHER), 'slots', slotId('b1', DATE, '1000'))));
  });

  it('reprogramar 15 min más tarde reutiliza la franja que se cruza', async () => {
    await assertSucceeds(book(as(CLIENT), 'a1', appointment()));
    const db = as(BARBER);
    const batch = writeBatch(db);
    batch.update(doc(db, 'appointments', 'a1'), {
      date: DATE, time: '10:15', startAt: Timestamp.fromDate(new Date('2030-01-15T15:15:00Z')),
      slotIds: [slotId('b1', DATE, '1015'), slotId('b1', DATE, '1030')], status: 'pending', updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'slots', slotId('b1', DATE, '1030')), { appointmentId: 'a1', barberId: 'b1', date: DATE });
    batch.delete(doc(db, 'slots', slotId('b1', DATE, '1000')));
    await assertSucceeds(batch.commit());
  });

  it('el cliente reprograma a otro día dentro de la política', async () => {
    await assertSucceeds(book(as(CLIENT), 'a1', appointment()));
    const db = as(CLIENT);
    const next = '2030-01-16';
    const batch = writeBatch(db);
    batch.update(doc(db, 'appointments', 'a1'), {
      date: next, time: '11:00', startAt: Timestamp.fromDate(new Date('2030-01-16T16:00:00Z')),
      slotIds: [slotId('b1', next, '1100'), slotId('b1', next, '1115')], status: 'pending', updatedAt: serverTimestamp(),
    });
    for (const h of ['1100', '1115']) batch.set(doc(db, 'slots', slotId('b1', next, h)), { appointmentId: 'a1', barberId: 'b1', date: next });
    for (const s of appointment().slotIds) batch.delete(doc(db, 'slots', s));
    await assertSucceeds(batch.commit());
  });

  it('nadie borra citas', async () => {
    await assertFails(deleteDoc(doc(as(ADMIN), 'appointments', 'existing')));
  });
});

describe('ventas', () => {
  const sale = (over: Record<string, unknown> = {}) => ({
    status: 'paid', subtotal: 20000, discount: 0, total: 20000, paymentMethod: 'cash',
    items: [{ name: 'Corte', quantity: 1, subtotal: 20000 }], createdBy: ADMIN, ...over,
  });

  it('solo el admin registra cobros', async () => {
    await assertFails(setDoc(doc(as(BARBER), 'sales', 's1'), sale({ createdBy: BARBER })));
    await assertFails(setDoc(doc(as(CLIENT), 'sales', 's1'), sale({ createdBy: CLIENT })));
    await assertSucceeds(setDoc(doc(as(ADMIN), 'sales', 's1'), sale()));
  });

  it('el total debe cuadrar con subtotal y descuento', async () => {
    await assertFails(setDoc(doc(as(ADMIN), 'sales', 's2'), sale({ discount: 5000, total: 20000 })));
    await assertFails(setDoc(doc(as(ADMIN), 'sales', 's3'), sale({ discount: 30000, total: -10000 })));
  });

  it('una venta se anula una sola vez y no se edita', async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), 'sales', 's1'), sale()));
    await assertFails(updateDoc(doc(as(ADMIN), 'sales', 's1'), { total: 1 }));
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'sales', 's1'), { status: 'voided', voidReason: 'Error', voidedBy: ADMIN, voidedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(ADMIN), 'sales', 's1'), { status: 'paid' }));
  });
});

describe('notificaciones', () => {
  it('el cliente avisa al barbero de su propia cita y a la administración', async () => {
    await assertSucceeds(addDoc(collection(as(CLIENT), 'notifications'), notification()));
    await assertSucceeds(addDoc(collection(as(CLIENT), 'notifications'), notification({ userId: null, audience: 'admin' })));
  });

  it('no se puede avisar a alguien ajeno a la cita', async () => {
    await assertFails(addDoc(collection(as(CLIENT), 'notifications'), notification({ userId: OTHER })));
    await assertFails(addDoc(collection(as(CLIENT), 'notifications'), notification({ userId: BARBER2 })));
  });

  it('no se puede avisar usando una cita ajena o inexistente', async () => {
    await assertFails(addDoc(collection(as(CLIENT), 'notifications'), notification({ appointmentId: 'other-barber', userId: BARBER2 })));
    await assertFails(addDoc(collection(as(CLIENT), 'notifications'), notification({ appointmentId: 'no-existe' })));
    await assertFails(addDoc(collection(as(OTHER), 'notifications'), notification({ actorUid: OTHER, userId: null, audience: 'admin' })));
  });

  it('no se puede suplantar al autor ni enlazar fuera de la app', async () => {
    await assertFails(addDoc(collection(as(CLIENT), 'notifications'), notification({ actorUid: ADMIN })));
    await assertFails(addDoc(collection(as(CLIENT), 'notifications'), notification({ link: 'https://phishing.example' })));
  });

  it('solo el destinatario lee su aviso; la bandeja admin solo los admins', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      await setDoc(doc(db, 'notifications', 'n1'), notification());
      await setDoc(doc(db, 'notifications', 'n2'), notification({ userId: null, audience: 'admin' }));
    });
    await assertSucceeds(getDoc(doc(as(BARBER), 'notifications', 'n1')));
    await assertFails(getDoc(doc(as(CLIENT), 'notifications', 'n1')));
    await assertSucceeds(getDoc(doc(as(ADMIN), 'notifications', 'n2')));
    await assertFails(getDoc(doc(as(BARBER), 'notifications', 'n2')));
  });
});

describe('logo y auditoría', () => {
  const logo = (value: string | null) => ({ logo: value, updatedAt: serverTimestamp(), updatedBy: ADMIN });

  it('solo el admin cambia el logo, y solo con imágenes válidas', async () => {
    await assertFails(setDoc(doc(as(CLIENT), 'branding', 'current'), { ...logo('data:image/png;base64,AAAA'), updatedBy: CLIENT }));
    await assertSucceeds(setDoc(doc(as(ADMIN), 'branding', 'current'), logo('data:image/png;base64,AAAA')));
    await assertFails(setDoc(doc(as(ADMIN), 'branding', 'current'), logo('data:image/svg+xml;base64,PHN2Zz4=')));
    await assertFails(setDoc(doc(as(ADMIN), 'branding', 'current'), logo(`data:image/png;base64,${'A'.repeat(150_001)}`)));
  });

  it('la auditoría es inmutable y no se puede suplantar', async () => {
    await assertFails(updateDoc(doc(as(ADMIN), 'auditLogs', 'l1'), { action: 'x' }));
    await assertFails(deleteDoc(doc(as(ADMIN), 'auditLogs', 'l1')));
    await assertFails(addDoc(collection(as(CLIENT), 'auditLogs'), { action: 'sale.created', actorUid: ADMIN, at: serverTimestamp() }));
  });
});
