export interface Client {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  /** Preferencias del cliente (visibles para el propio cliente). */
  notes: string;
  status: 'active' | 'inactive';
  /** UID de la cuenta del cliente si se registró en el portal; `null` = cliente de mostrador. */
  userId: string | null;
  createdAt: string;
}

export type CreateClientDTO = Pick<Client, 'fullName' | 'email' | 'phone' | 'notes'>;
