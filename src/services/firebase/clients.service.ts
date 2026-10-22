import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase.config';
import { str, strOrNull, toIso } from './helpers';
import type { Client, CreateClientDTO } from '@/types/client.types';
import { cleanText, normalizePhone } from '@/domain/validation';

const COLLECTION_NAME = 'clients';

const toClient = (id: string, data: Record<string, unknown>): Client => ({
  id,
  fullName: str(data.fullName),
  email: str(data.email),
  phone: str(data.phone),
  notes: str(data.notes),
  status: data.status === 'inactive' ? 'inactive' : 'active',
  userId: strOrNull(data.userId),
  createdAt: toIso(data.createdAt),
});

export const clientsService = {
  /** Solo administrador (las reglas impiden a barberos y clientes listar la colección). */
  async getClients(): Promise<Client[]> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    return snapshot.docs.map((d) => toClient(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getClient(id: string): Promise<Client | null> {
    const snap = await getDoc(doc(db, COLLECTION_NAME, id));
    return snap.exists() ? toClient(snap.id, snap.data()) : null;
  },

  /** Cliente de mostrador creado por el administrador (sin cuenta en el portal). */
  async createClient(dto: CreateClientDTO): Promise<string> {
    const ref = doc(collection(db, COLLECTION_NAME));
    await setDoc(ref, {
      fullName: cleanText(dto.fullName, 80),
      email: dto.email.trim().toLowerCase(),
      phone: normalizePhone(dto.phone),
      notes: cleanText(dto.notes, 300),
      status: 'active',
      userId: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateClient(id: string, data: Pick<Client, 'fullName' | 'phone' | 'notes'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      fullName: cleanText(data.fullName, 80),
      phone: normalizePhone(data.phone),
      notes: cleanText(data.notes, 300),
    });
  },

  /** Se desactiva en lugar de borrar para conservar el historial de citas y ventas. */
  async setStatus(id: string, status: Client['status']): Promise<void> {
    await updateDoc(doc(db, COLLECTION_NAME, id), { status });
  },
};
