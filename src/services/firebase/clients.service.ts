import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase.config';
import { Client, CreateClientDTO } from '@/types/client.types';

const COLLECTION_NAME = 'clients';

export const clientsService = {
  async getClients(): Promise<Client[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          notes: data.notes || '',
          status: data.status || 'active',
          totalAppointments: data.totalAppointments || 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Client;
      });
    } catch {
      throw new Error('No fue posible cargar el listado de clientes.');
    }
  },

  async createClient(clientData: CreateClientDTO): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...clientData,
        totalAppointments: 0,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch {
      throw new Error('No fue posible registrar al cliente.');
    }
  },

  async deleteClient(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch {
      throw new Error('No fue posible eliminar el cliente.');
    }
  }
};
