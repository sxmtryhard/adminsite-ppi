export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  /** Id del documento en `clients`. Para clientes registrados coincide con su UID. */
  clientId: string;
  clientName: string;
  clientPhone: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  date: string; // YYYY-MM-DD (zona del negocio)
  time: string; // HH:mm (zona del negocio)
  /** Instante absoluto de inicio (ISO). */
  startAt: string;
  /** Ids de los documentos de bloqueo en `slots`. */
  slotIds: string[];
  status: AppointmentStatus;
  /** Nota visible para el cliente y el barbero asignado. */
  notes: string;
  /** Venta (cobro) asociada. Se fija al cobrar y evita cobrar dos veces. */
  saleId: string | null;
  createdBy: string;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  clientId: string;
  clientName: string;
  clientPhone: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  date: string;
  time: string;
  notes: string;
}
