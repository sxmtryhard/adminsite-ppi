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
import { ServiceItem, CreateServiceDTO } from '@/types/service.types';

const COLLECTION_NAME = 'services';

export const servicesService = {
  async getServices(): Promise<ServiceItem[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('price', 'asc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          description: data.description || '',
          price: data.price || 0,
          durationMinutes: data.durationMinutes || 30,
          category: data.category || 'haircut',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as ServiceItem;
      });
    } catch {
      throw new Error('No fue posible cargar los servicios.');
    }
  },

  async createService(serviceData: CreateServiceDTO): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...serviceData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch {
      throw new Error('No fue posible registrar el servicio.');
    }
  },

  async updateServiceStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { status });
    } catch {
      throw new Error('No fue posible actualizar el estado del servicio.');
    }
  },

  async deleteService(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch {
      throw new Error('No fue posible eliminar el servicio.');
    }
  },
};
