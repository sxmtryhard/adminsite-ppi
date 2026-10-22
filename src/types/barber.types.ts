export interface DaySchedule {
  start: string; // HH:mm
  end: string; // HH:mm
  breakStart?: string | null;
  breakEnd?: string | null;
}

/** Clave '0'..'6' (domingo..sábado). `null` = día no laborable. */
export type WeeklySchedule = Record<string, DaySchedule | null>;

export interface Barber {
  id: string;
  fullName: string;
  specialty: string;
  status: 'active' | 'inactive';
  /** UID de la cuenta de usuario vinculada (rol barber), si existe. */
  userId: string | null;
  schedule: WeeklySchedule;
  /** Días no laborables puntuales (ausencias, festivos) en formato YYYY-MM-DD. */
  blockedDates: string[];
  createdAt: string;
}

export type CreateBarberDTO = Omit<Barber, 'id' | 'createdAt' | 'userId'>;

/** Datos del barbero visibles solo para el administrador y el propio barbero. */
export interface BarberPrivate {
  phone: string;
  /** Porcentaje (0-100) sobre ingresos de servicios. `null` = sin política de comisiones. */
  commissionRate: number | null;
}
