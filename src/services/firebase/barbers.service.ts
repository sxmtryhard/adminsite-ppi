import { collection, doc, getDoc, getDocs, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, AppError, numOrNull, str, strOrNull, toIso, type Actor } from './helpers';
import type { Barber, BarberPrivate, CreateBarberDTO, DaySchedule, WeeklySchedule } from '@/types/barber.types';
import { isValidDaySchedule } from '@/domain/availability';
import { cleanText, normalizePhone } from '@/domain/validation';

const COLLECTION_NAME = 'barbers';

/** Plantilla inicial sugerida (editable), no un horario aprobado por el negocio. */
export const DEFAULT_SCHEDULE: WeeklySchedule = {
  '0': null,
  '1': { start: '09:00', end: '19:00', breakStart: '13:00', breakEnd: '14:00' },
  '2': { start: '09:00', end: '19:00', breakStart: '13:00', breakEnd: '14:00' },
  '3': { start: '09:00', end: '19:00', breakStart: '13:00', breakEnd: '14:00' },
  '4': { start: '09:00', end: '19:00', breakStart: '13:00', breakEnd: '14:00' },
  '5': { start: '09:00', end: '19:00', breakStart: '13:00', breakEnd: '14:00' },
  '6': { start: '09:00', end: '17:00', breakStart: null, breakEnd: null },
};

const toSchedule = (value: unknown): WeeklySchedule => {
  const result: WeeklySchedule = {};
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  for (let i = 0; i < 7; i++) {
    const day = source[String(i)] as DaySchedule | null | undefined;
    result[String(i)] = day && isValidDaySchedule(day) ? day : null;
  }
  return result;
};

const toBarber = (id: string, data: Record<string, unknown>): Barber => ({
  id,
  fullName: str(data.fullName),
  specialty: str(data.specialty, 'Barbero'),
  status: data.status === 'inactive' ? 'inactive' : 'active',
  userId: strOrNull(data.userId),
  schedule: toSchedule(data.schedule),
  blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates.filter((d): d is string => typeof d === 'string') : [],
  createdAt: toIso(data.createdAt),
});

export const barbersService = {
  async getBarbers(): Promise<Barber[]> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    return snapshot.docs.map((d) => toBarber(d.id, d.data())).sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  async getBarber(id: string): Promise<Barber | null> {
    const snap = await getDoc(doc(db, COLLECTION_NAME, id));
    return snap.exists() ? toBarber(snap.id, snap.data()) : null;
  },

  async createBarber(dto: CreateBarberDTO, phone: string): Promise<string> {
    const ref = doc(collection(db, COLLECTION_NAME));
    const batch = writeBatch(db);
    batch.set(ref, {
      fullName: cleanText(dto.fullName, 80),
      specialty: cleanText(dto.specialty, 80),
      status: dto.status,
      userId: null,
      schedule: dto.schedule,
      blockedDates: [],
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'barberPrivate', ref.id), { phone: normalizePhone(phone), commissionRate: null });
    await batch.commit();
    return ref.id;
  },

  async updateBarberStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    await updateDoc(doc(db, COLLECTION_NAME, id), { status });
  },

  /** Usado por el administrador y por el propio barbero (las reglas limitan los campos). */
  async updateAvailability(id: string, schedule: WeeklySchedule, blockedDates: string[]): Promise<void> {
    for (const day of Object.values(schedule)) {
      if (day && !isValidDaySchedule(day)) throw new AppError('invalid', 'Horario inválido.');
    }
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      schedule,
      blockedDates: [...new Set(blockedDates)].sort(),
    });
  },

  async getPrivate(id: string): Promise<BarberPrivate> {
    const snap = await getDoc(doc(db, 'barberPrivate', id));
    const data = snap.exists() ? snap.data() : {};
    return { phone: str(data.phone), commissionRate: numOrNull(data.commissionRate) };
  },

  async updatePrivate(id: string, value: BarberPrivate, previous: BarberPrivate, actor: Actor): Promise<void> {
    const batch = writeBatch(db);
    batch.set(doc(db, 'barberPrivate', id), { phone: normalizePhone(value.phone), commissionRate: value.commissionRate });
    if (value.commissionRate !== previous.commissionRate) {
      addAudit(batch, actor, 'barber.commission_changed', 'barbers', id, {
        from: previous.commissionRate,
        to: value.commissionRate,
      });
    }
    await batch.commit();
  },
};
