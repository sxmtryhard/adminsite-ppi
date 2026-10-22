export type PaymentMethod = 'cash' | 'transfer' | 'card';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Datáfono',
};

export type ItemType = 'product' | 'service';

export interface SaleItem {
  /** Id del producto o servicio. */
  refId: string;
  type: ItemType;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

/**
 * Comprobante de venta. Un ingreso se reconoce únicamente cuando existe una venta con
 * estado `paid`; una venta anulada (`voided`) deja de contar. Las citas completadas no
 * son ingreso por sí mismas: se cobran mediante una venta con `appointmentId`.
 */
export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: 'paid' | 'voided';
  barberId: string | null;
  barberName: string;
  clientId: string | null;
  clientName: string;
  appointmentId: string | null;
  createdBy: string;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
}

/** Costos de una venta (colección privada del administrador). `null` = costo no configurado. */
export interface SaleCostItem {
  refId: string;
  type: ItemType;
  quantity: number;
  unitCost: number | null;
}

export interface SaleCost {
  saleId: string;
  items: SaleCostItem[];
  createdAt: string;
}

export interface CreateSaleInput {
  items: SaleItem[];
  discount: number;
  paymentMethod: PaymentMethod;
  barberId: string | null;
  barberName: string;
  clientId: string | null;
  clientName: string;
  appointmentId: string | null;
}
