import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type Transaction,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, AppError, num, numOrNull, str, strOrNull, toIso, type Actor } from './helpers';
import type {
  CreateProductInput,
  InventoryMovement,
  MovementType,
  Product,
  ProductCategory,
} from '@/types/product.types';
import { cleanText } from '@/domain/validation';

const COLLECTION_NAME = 'products';

const toProduct = (id: string, data: Record<string, unknown>): Product => ({
  id,
  name: str(data.name),
  description: str(data.description),
  category: str(data.category, 'otros') as ProductCategory,
  salePrice: num(data.salePrice),
  stock: num(data.stock),
  minStock: num(data.minStock, 5),
  active: data.active !== false,
  createdAt: toIso(data.createdAt),
});

/** Costo promedio ponderado tras una entrada de inventario. */
export const weightedAverageCost = (
  currentStock: number,
  currentAvg: number | null,
  qty: number,
  unitCost: number
): number => {
  if (currentStock <= 0 || currentAvg === null) return unitCost;
  return (currentStock * currentAvg + qty * unitCost) / (currentStock + qty);
};

const writeMovement = (
  tx: Transaction,
  id: string,
  m: Omit<InventoryMovement, 'id' | 'createdAt'>
) => {
  tx.set(doc(db, 'inventoryMovements', id), { ...m, createdAt: serverTimestamp() });
};

export const productsService = {
  async getProducts(): Promise<Product[]> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    return snapshot.docs.map((d) => toProduct(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
  },

  /** Costos de adquisición (solo administrador). */
  async getCosts(): Promise<Map<string, number | null>> {
    const snapshot = await getDocs(collection(db, 'productCosts'));
    return new Map(snapshot.docs.map((d) => [d.id, numOrNull(d.data().avgCost)]));
  },

  async createProduct(input: CreateProductInput, actor: Actor): Promise<string> {
    const ref = doc(collection(db, COLLECTION_NAME));
    await runTransaction(db, async (tx) => {
      tx.set(ref, {
        name: cleanText(input.name, 80),
        description: cleanText(input.description, 300),
        category: input.category,
        salePrice: input.salePrice,
        stock: input.initialStock,
        minStock: input.minStock,
        active: true,
        createdAt: serverTimestamp(),
      });
      tx.set(doc(db, 'productCosts', ref.id), { avgCost: input.initialStock > 0 ? input.unitCost : null });
      if (input.initialStock > 0) {
        writeMovement(tx, `${ref.id}_initial`, {
          productId: ref.id,
          productName: input.name,
          type: 'purchase',
          quantity: input.initialStock,
          unitCost: input.unitCost,
          stockAfter: input.initialStock,
          reason: 'Existencias iniciales',
          refId: null,
          createdBy: actor.uid,
        });
      }
      addAudit(tx, actor, 'product.created', 'products', ref.id, { salePrice: input.salePrice });
    });
    return ref.id;
  },

  async updateProduct(
    current: Product,
    data: Pick<Product, 'name' | 'description' | 'category' | 'salePrice' | 'minStock'>,
    actor: Actor
  ): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION_NAME, current.id), {
      name: cleanText(data.name, 80),
      description: cleanText(data.description, 300),
      category: data.category,
      salePrice: data.salePrice,
      minStock: data.minStock,
    });
    if (current.salePrice !== data.salePrice) {
      addAudit(batch, actor, 'product.price_changed', 'products', current.id, {
        from: current.salePrice,
        to: data.salePrice,
      });
    }
    await batch.commit();
  },

  async setActive(product: Product, active: boolean, actor: Actor): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION_NAME, product.id), { active });
    addAudit(batch, actor, 'product.status_changed', 'products', product.id, { active });
    await batch.commit();
  },

  /**
   * Entrada (compra) o ajuste manual, atómico: actualiza existencias, costo promedio (en compras)
   * y registra el movimiento. `operationId` se genera una vez por envío para evitar duplicados.
   */
  async recordMovement(
    params: {
      productId: string;
      type: Extract<MovementType, 'purchase' | 'adjustment'>;
      quantity: number;
      unitCost: number | null;
      reason: string;
      operationId: string;
    },
    actor: Actor
  ): Promise<void> {
    const productRef = doc(db, COLLECTION_NAME, params.productId);
    const costRef = doc(db, 'productCosts', params.productId);
    const movementRef = doc(db, 'inventoryMovements', params.operationId);

    await runTransaction(db, async (tx) => {
      const [productSnap, costSnap, movementSnap] = await Promise.all([
        tx.get(productRef),
        tx.get(costRef),
        tx.get(movementRef),
      ]);
      if (movementSnap.exists()) return; // ya registrado (reintento)
      if (!productSnap.exists()) throw new AppError('not-found', 'El producto no existe.');
      const stock = num(productSnap.data().stock);
      const nextStock = stock + params.quantity;
      if (nextStock < 0) {
        throw new AppError('negative-stock', `No hay existencias suficientes (disponible: ${stock}).`);
      }
      tx.update(productRef, { stock: nextStock });
      if (params.type === 'purchase') {
        if (params.unitCost === null || params.quantity <= 0) {
          throw new AppError('invalid', 'Una compra requiere cantidad positiva y costo unitario.');
        }
        const avg = costSnap.exists() ? numOrNull(costSnap.data().avgCost) : null;
        tx.set(costRef, { avgCost: weightedAverageCost(stock, avg, params.quantity, params.unitCost) });
      }
      writeMovement(tx, params.operationId, {
        productId: params.productId,
        productName: str(productSnap.data().name),
        type: params.type,
        quantity: params.quantity,
        unitCost: params.unitCost,
        stockAfter: nextStock,
        reason: cleanText(params.reason, 200),
        refId: null,
        createdBy: actor.uid,
      });
      addAudit(tx, actor, params.type === 'purchase' ? 'inventory.purchase' : 'inventory.adjustment', 'products', params.productId, {
        quantity: params.quantity,
        stockAfter: nextStock,
      });
    });
  },

  async getMovements(productId?: string): Promise<InventoryMovement[]> {
    const base = collection(db, 'inventoryMovements');
    const q = productId
      ? query(base, where('productId', '==', productId), limit(200))
      : query(base, orderBy('createdAt', 'desc'), limit(200));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          productId: str(data.productId),
          productName: str(data.productName),
          type: str(data.type, 'adjustment') as MovementType,
          quantity: num(data.quantity),
          unitCost: numOrNull(data.unitCost),
          stockAfter: num(data.stockAfter),
          reason: str(data.reason),
          refId: strOrNull(data.refId),
          createdBy: str(data.createdBy),
          createdAt: toIso(data.createdAt),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
