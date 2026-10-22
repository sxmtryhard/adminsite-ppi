import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, num, numOrNull, str, toIso, type Actor } from './helpers';
import type { CreateServiceDTO, ServiceCategory, ServiceItem } from '@/types/service.types';
import { cleanText } from '@/domain/validation';

const COLLECTION_NAME = 'services';

const toService = (id: string, data: Record<string, unknown>): ServiceItem => ({
  id,
  name: str(data.name),
  description: str(data.description),
  price: num(data.price),
  durationMinutes: num(data.durationMinutes, 30),
  category: (str(data.category, 'other') as ServiceCategory),
  status: data.status === 'inactive' ? 'inactive' : 'active',
  createdAt: toIso(data.createdAt),
});

const sanitize = (dto: CreateServiceDTO) => ({
  name: cleanText(dto.name, 80),
  description: cleanText(dto.description, 300),
  price: dto.price,
  durationMinutes: dto.durationMinutes,
  category: dto.category,
  status: dto.status,
});

export const servicesService = {
  async getServices(): Promise<ServiceItem[]> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    return snapshot.docs.map((d) => toService(d.id, d.data())).sort((a, b) => a.price - b.price);
  },

  /** Costos directos por servicio (solo administrador). */
  async getCosts(): Promise<Map<string, number | null>> {
    const snapshot = await getDocs(collection(db, 'serviceCosts'));
    return new Map(snapshot.docs.map((d) => [d.id, numOrNull(d.data().directCost)]));
  },

  async createService(dto: CreateServiceDTO, directCost: number | null, actor: Actor): Promise<string> {
    const ref = doc(collection(db, COLLECTION_NAME));
    const batch = writeBatch(db);
    batch.set(ref, { ...sanitize(dto), createdAt: serverTimestamp() });
    batch.set(doc(db, 'serviceCosts', ref.id), { directCost });
    addAudit(batch, actor, 'service.price_changed', 'services', ref.id, { from: null, to: dto.price });
    await batch.commit();
    return ref.id;
  },

  async updateService(
    current: ServiceItem,
    dto: CreateServiceDTO,
    previousCost: number | null,
    directCost: number | null,
    actor: Actor
  ): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION_NAME, current.id), sanitize(dto));
    if (current.price !== dto.price) {
      addAudit(batch, actor, 'service.price_changed', 'services', current.id, { from: current.price, to: dto.price });
    }
    if (current.status !== dto.status) {
      addAudit(batch, actor, 'service.status_changed', 'services', current.id, { to: dto.status });
    }
    if (previousCost !== directCost) {
      batch.set(doc(db, 'serviceCosts', current.id), { directCost });
      addAudit(batch, actor, 'service.cost_changed', 'services', current.id, { from: previousCost, to: directCost });
    }
    await batch.commit();
  },
};
