export type ProductCategory = 'cuidado_capilar' | 'barba' | 'accesorios' | 'otros';

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  cuidado_capilar: 'Cuidado capilar',
  barba: 'Barba',
  accesorios: 'Accesorios',
  otros: 'Otros',
};

/** Catálogo público de productos (visible para clientes). No contiene costos. */
export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  salePrice: number;
  stock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
}

/** Costo de adquisición (promedio ponderado). Colección privada del administrador. */
export interface ProductCost {
  avgCost: number | null;
}

export interface CreateProductInput {
  name: string;
  description: string;
  category: ProductCategory;
  salePrice: number;
  minStock: number;
  /** Existencias iniciales y su costo unitario: se registran como entrada de inventario. */
  initialStock: number;
  unitCost: number | null;
}

export type MovementType = 'purchase' | 'sale' | 'sale_void' | 'adjustment';

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  purchase: 'Entrada (compra)',
  sale: 'Salida (venta)',
  sale_void: 'Devolución por anulación',
  adjustment: 'Ajuste manual',
};

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  /** Positivo = entrada, negativo = salida. */
  quantity: number;
  unitCost: number | null;
  stockAfter: number;
  reason: string;
  refId: string | null;
  createdBy: string;
  createdAt: string;
}
