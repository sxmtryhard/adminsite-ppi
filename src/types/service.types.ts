export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: 'haircut' | 'beard' | 'combo' | 'treatment' | 'other';
  status: 'active' | 'inactive';
  createdAt: string;
}

export type CreateServiceDTO = Omit<ServiceItem, 'id' | 'createdAt'>;