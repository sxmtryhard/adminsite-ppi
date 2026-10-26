import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, AppError, num, str, strOrNull, toIso, type Actor } from './helpers';
import type { Appointment, AppointmentStatus, CreateAppointmentInput } from '@/types/appointment.types';
import type { UserRole } from '@/types/auth.types';
import { MAX_SERVICE_MINUTES, slotKeysFor } from '@/domain/availability';
import { canTransition, clientCanModify, releasesSlots, STATUS_LABELS } from '@/domain/appointmentStatus';
import { isValidDate, isValidTime, toInstant } from '@/domain/time';
import { cleanText } from '@/domain/validation';

const COLLECTION_NAME = 'appointments';

const STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

const toAppointment = (id: string, data: Record<string, unknown>): Appointment => ({
  id,
  clientId: str(data.clientId),
  clientName: str(data.clientName, 'Cliente'),
  clientPhone: str(data.clientPhone),
  barberId: str(data.barberId),
  barberName: str(data.barberName, 'Sin asignar'),
  serviceId: str(data.serviceId),
  serviceName: str(data.serviceName, 'Servicio'),
  servicePrice: num(data.servicePrice),
  durationMinutes: num(data.durationMinutes, 30),
  date: str(data.date),
  time: str(data.time),
  startAt: data.startAt instanceof Timestamp ? data.startAt.toDate().toISOString() : toInstant(str(data.date), str(data.time, '00:00')).toISOString(),
  slotIds: Array.isArray(data.slotIds) ? data.slotIds.filter((s): s is string => typeof s === 'string') : [],
  status: STATUSES.includes(data.status as AppointmentStatus) ? (data.status as AppointmentStatus) : 'pending',
  notes: str(data.notes),
  saleId: strOrNull(data.saleId),
  createdBy: str(data.createdBy),
  cancelReason: strOrNull(data.cancelReason),
  createdAt: toIso(data.createdAt),
  updatedAt: toIso(data.updatedAt ?? data.createdAt),
});

const sortByStart = (list: Appointment[]) => list.sort((a, b) => a.startAt.localeCompare(b.startAt));

const SLOT_TAKEN = new AppError(
  'slot-taken',
  'Ese horario acaba de ser reservado por otra persona. Elige otra hora disponible.'
);

/** Datos para notificar a los involucrados tras una operación. */
export interface AppointmentParties {
  appointment: Appointment;
  clientUserId: string | null;
  barberUserId: string | null;
}

export const appointmentsService = {
  /** Agenda general (administrador), filtrada por rango de fechas. */
  async listByRange(from: string, to: string): Promise<Appointment[]> {
    const q = query(collection(db, COLLECTION_NAME), where('date', '>=', from), where('date', '<=', to));
    const snapshot = await getDocs(q);
    return sortByStart(snapshot.docs.map((d) => toAppointment(d.id, d.data())));
  },

  /** Citas de un barbero. La consulta coincide con la regla, que solo permite su propio barberId. */
  async listForBarber(barberId: string): Promise<Appointment[]> {
    const q = query(collection(db, COLLECTION_NAME), where('barberId', '==', barberId));
    const snapshot = await getDocs(q);
    return sortByStart(snapshot.docs.map((d) => toAppointment(d.id, d.data())));
  },

  /** Citas de un cliente (para el portal y para el historial del administrador). */
  async listForClient(clientId: string): Promise<Appointment[]> {
    const q = query(collection(db, COLLECTION_NAME), where('clientId', '==', clientId));
    const snapshot = await getDocs(q);
    return sortByStart(snapshot.docs.map((d) => toAppointment(d.id, d.data())));
  },

  /** Franjas ocupadas de un barbero en una fecha (no expone datos de otros clientes). */
  async takenSlots(barberId: string, date: string): Promise<Set<string>> {
    const q = query(collection(db, 'slots'), where('barberId', '==', barberId), where('date', '==', date));
    const snapshot = await getDocs(q);
    return new Set(snapshot.docs.map((d) => d.id));
  },

  /**
   * Crea la cita y sus documentos de bloqueo en una transacción. Si dos personas reservan a la
   * vez la misma franja, Firestore reintenta la segunda transacción, que encuentra la franja
   * ocupada y falla. Las reglas además rechazan crear un bloqueo que ya existe.
   */
  async book(
    input: CreateAppointmentInput,
    meta: { status: 'pending' | 'confirmed'; clientUserId: string | null; barberUserId: string | null },
    actor: Actor
  ): Promise<string> {
    if (!isValidDate(input.date) || !isValidTime(input.time)) {
      throw new AppError('invalid', 'Fecha u hora inválida.');
    }
    if (input.durationMinutes <= 0 || input.durationMinutes > MAX_SERVICE_MINUTES) {
      throw new AppError('invalid', 'La duración del servicio no es válida.');
    }
    const startAt = toInstant(input.date, input.time);
    if (startAt.getTime() <= Date.now()) throw new AppError('past', 'No se puede reservar en el pasado.');

    const apptRef = doc(collection(db, COLLECTION_NAME));
    const slotIds = slotKeysFor(input.barberId, input.date, input.time, input.durationMinutes);

    await runTransaction(db, async (tx) => {
      const snaps = await Promise.all(slotIds.map((id) => tx.get(doc(db, 'slots', id))));
      if (snaps.some((s) => s.exists())) throw SLOT_TAKEN;

      tx.set(apptRef, {
        ...input,
        notes: cleanText(input.notes, 300),
        startAt: Timestamp.fromDate(startAt),
        slotIds,
        status: meta.status,
        saleId: null,
        cancelReason: null,
        clientUserId: meta.clientUserId,
        barberUserId: meta.barberUserId,
        createdBy: actor.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      for (const id of slotIds) {
        tx.set(doc(db, 'slots', id), { appointmentId: apptRef.id, barberId: input.barberId, date: input.date });
      }
    });
    return apptRef.id;
  },

  /** Cambia el estado validando la transición y libera las franjas cuando corresponde. */
  async changeStatus(
    id: string,
    to: AppointmentStatus,
    ctx: { role: UserRole; cancellationMinHours: number; reason?: string },
    actor: Actor
  ): Promise<AppointmentParties> {
    const ref = doc(db, COLLECTION_NAME, id);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new AppError('not-found', 'La cita no existe.');
      const appt = toAppointment(snap.id, snap.data());
      if (!canTransition(appt.status, to, ctx.role)) {
        throw new AppError('invalid-transition', `No se puede pasar de "${STATUS_LABELS[appt.status]}" a "${STATUS_LABELS[to]}".`);
      }
      if (ctx.role === 'client' && !clientCanModify(new Date(appt.startAt), new Date(), ctx.cancellationMinHours)) {
        throw new AppError('policy', `Solo puedes cancelar con al menos ${ctx.cancellationMinHours} h de antelación.`);
      }
      const slotSnaps = releasesSlots(to)
        ? await Promise.all(appt.slotIds.map((s) => tx.get(doc(db, 'slots', s))))
        : [];

      const cancelReason = to === 'cancelled' ? cleanText(ctx.reason ?? '', 200) || null : appt.cancelReason;
      tx.update(ref, { status: to, updatedAt: serverTimestamp(), cancelReason });
      for (const s of slotSnaps) {
        if (s.exists() && s.data().appointmentId === id) tx.delete(s.ref);
      }
      addAudit(tx, actor, 'appointment.status_changed', 'appointments', id, { from: appt.status, to });
      return {
        appointment: { ...appt, status: to, cancelReason },
        clientUserId: strOrNull(snap.data().clientUserId),
        barberUserId: strOrNull(snap.data().barberUserId),
      };
    });
  },

  /** Reprograma (mismo barbero y servicio) moviendo los bloqueos de forma atómica. */
  async reschedule(
    id: string,
    date: string,
    time: string,
    ctx: { role: UserRole; cancellationMinHours: number },
    actor: Actor
  ): Promise<AppointmentParties> {
    if (!isValidDate(date) || !isValidTime(time)) throw new AppError('invalid', 'Fecha u hora inválida.');
    const startAt = toInstant(date, time);
    if (startAt.getTime() <= Date.now()) throw new AppError('past', 'No se puede reprogramar al pasado.');
    const ref = doc(db, COLLECTION_NAME, id);

    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new AppError('not-found', 'La cita no existe.');
      const appt = toAppointment(snap.id, snap.data());
      if (!['pending', 'confirmed'].includes(appt.status)) {
        throw new AppError('invalid', 'Solo se pueden reprogramar citas pendientes o confirmadas.');
      }
      if (ctx.role === 'client' && !clientCanModify(new Date(appt.startAt), new Date(), ctx.cancellationMinHours)) {
        throw new AppError('policy', `Solo puedes reprogramar con al menos ${ctx.cancellationMinHours} h de antelación.`);
      }

      const oldIds = new Set(appt.slotIds);
      const newIds = slotKeysFor(appt.barberId, date, time, appt.durationMinutes);
      const toCreate = newIds.filter((s) => !oldIds.has(s));
      const toDelete = appt.slotIds.filter((s) => !newIds.includes(s));

      const createSnaps = await Promise.all(toCreate.map((s) => tx.get(doc(db, 'slots', s))));
      if (createSnaps.some((s) => s.exists())) throw SLOT_TAKEN;
      const deleteSnaps = await Promise.all(toDelete.map((s) => tx.get(doc(db, 'slots', s))));

      // Un cambio hecho por el cliente vuelve a requerir confirmación del barbero.
      const status = ctx.role === 'client' ? 'pending' : appt.status;
      tx.update(ref, { date, time, startAt: Timestamp.fromDate(startAt), slotIds: newIds, status, updatedAt: serverTimestamp() });
      for (const s of toCreate) {
        tx.set(doc(db, 'slots', s), { appointmentId: id, barberId: appt.barberId, date });
      }
      for (const s of deleteSnaps) {
        if (s.exists() && s.data().appointmentId === id) tx.delete(s.ref);
      }
      addAudit(tx, actor, 'appointment.rescheduled', 'appointments', id, {
        from: `${appt.date} ${appt.time}`,
        to: `${date} ${time}`,
      });
      return {
        appointment: { ...appt, date, time, startAt: startAt.toISOString(), slotIds: newIds, status },
        clientUserId: strOrNull(snap.data().clientUserId),
        barberUserId: strOrNull(snap.data().barberUserId),
      };
    });
  },
};
