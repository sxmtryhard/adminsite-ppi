export type ServiceCategory = 'haircut' | 'beard' | 'combo' | 'treatment' | 'other';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  haircut: 'Corte',
  beard: 'Barba',
  combo: 'Combo',
  treatment: 'Tratamiento',
  other: 'Otro',
};

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: ServiceCategory;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type CreateServiceDTO = Omit<ServiceItem, 'id' | 'createdAt'>;

/** Costo directo por servicio (insumos, etc.). Privado del administrador. `null` = no configurado. */
export interface ServiceCost {
  directCost: number | null;
}
