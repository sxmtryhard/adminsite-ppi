export interface Client {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  notes?: string;
  status: 'active' | 'inactive';
  totalAppointments: number;
  createdAt: string;
}

export type CreateClientDTO = Omit<Client, 'id' | 'totalAppointments' | 'createdAt'>;