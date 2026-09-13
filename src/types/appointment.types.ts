export type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  barberName?: string;
  date: string;       // Formato YYYY-MM-DD
  time: string;       // Formato HH:mm (ej. "14:30")
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export type CreateAppointmentDTO = Omit<Appointment, 'id' | 'createdAt'>;