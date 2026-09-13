import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { Appointment, CreateAppointmentDTO, AppointmentStatus } from '@/types/appointment.types';

const COLLECTION_NAME = 'appointments';

export const appointmentsService = {
  async getAppointments(): Promise<Appointment[]> {
    try {
      // Obtenemos los documentos sin multi-orderBy para evitar requerir índices compuestos en Firebase
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));

      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          clientId: data.clientId || '',
          clientName: data.clientName || 'Cliente sin nombre',
          clientPhone: data.clientPhone || '',
          serviceId: data.serviceId || '',
          serviceName: data.serviceName || 'Servicio general',
          servicePrice: data.servicePrice || 0,
          durationMinutes: data.durationMinutes || 30,
          barberName: data.barberName || 'Barbero de turno',
          date: data.date || '',
          time: data.time || '',
          status: data.status || 'pending',
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Appointment;
      });

      // Ordenamos en memoria por fecha y hora descendente
      return list.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      });
    } catch {
      throw new Error('No fue posible cargar las citas.');
    }
  },

  async createAppointment(dto: CreateAppointmentDTO): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...dto,
        createdAt: serverTimestamp(),
      });

      if (dto.clientId) {
        try {
          const clientRef = doc(db, 'clients', dto.clientId);
          await updateDoc(clientRef, {
            totalAppointments: increment(1),
          });
        } catch {
          // Si el cliente no existe o falla el incremento, no bloquea la cita
        }
      }

      return docRef.id;
    } catch {
      throw new Error('No fue posible agendar la cita.');
    }
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { status });
    } catch {
      throw new Error('No fue posible actualizar el estado de la cita.');
    }
  },

  async deleteAppointment(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch {
      throw new Error('No fue posible cancelar/eliminar la cita.');
    }
  },
};