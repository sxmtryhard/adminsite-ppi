export interface Barber {
  id: string;
  fullName: string;
  phone: string;
  specialty: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type CreateBarberDTO = Omit<Barber, 'id' | 'createdAt'>;