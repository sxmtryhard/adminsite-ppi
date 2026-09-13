export type PaymentMethod = 'cash' | 'transfer' | 'card';

export interface SaleItem {
  id: string;
  type: 'product' | 'service';
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  barberName?: string;
  notes?: string;
  createdAt: string;
}

export type CreateSaleDTO = Omit<Sale, 'id' | 'createdAt'>;