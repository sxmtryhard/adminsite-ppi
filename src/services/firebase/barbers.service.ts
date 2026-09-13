import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { Barber, CreateBarberDTO } from '@/types/barber.types';

const COLLECTION_NAME = 'barbers';

export const barbersService = {
  async getBarbers(): Promise<Barber[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('fullName', 'asc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          fullName: data.fullName || '',
          phone: data.phone || '',
          specialty: data.specialty || 'Barbero Estilista',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Barber;
      });
    } catch {
      throw new Error('No fue posible cargar el listado de barberos.');
    }
  },

  async createBarber(barberData: CreateBarberDTO): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...barberData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch {
      throw new Error('No fue posible registrar al barbero.');
    }
  },

  async updateBarberStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { status });
    } catch {
      throw new Error('No fue posible actualizar el estado del barbero.');
    }
  },

  async deleteBarber(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch {
      throw new Error('No fue posible eliminar el barbero.');
    }
  },
};