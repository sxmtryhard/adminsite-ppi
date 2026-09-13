export interface Product {
  id: string;
  name: string;
  description?: string;
  category: 'cuidado_capilar' | 'barba' | 'accesorios' | 'otros';
  costPrice: number;    // Precio al que la barbería compra
  salePrice: number;    // Precio al cliente
  stock: number;        // Unidades actuales
  minStock: number;     // Alerta de inventario bajo
  createdAt: string;
}

export type CreateProductDTO = Omit<Product, 'id' | 'createdAt'>;