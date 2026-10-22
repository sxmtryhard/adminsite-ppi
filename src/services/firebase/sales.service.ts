import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, AppError, num, numOrNull, str, strOrNull, toIso, toIsoOrNull, type Actor } from './helpers';
import type { CreateSaleInput, ItemType, PaymentMethod, Sale, SaleCost, SaleCostItem, SaleItem } from '@/types/sale.types';
import { toInstant, addDays } from '@/domain/time';
import { cleanText } from '@/domain/validation';

const COLLECTION_NAME = 'sales';
export const MAX_SALE_LINES = 10;

const toItems = (value: unknown): SaleItem[] =>
  (Array.isArray(value) ? value : []).map((raw) => {
    const i = raw as Record<string, unknown>;
    const unitPrice = num(i.unitPrice ?? i.price);
    const quantity = num(i.quantity, 1);
    return {
      refId: str(i.refId ?? i.id),
      type: i.type === 'service' ? 'service' : 'product',
      name: str(i.name),
      unitPrice,
      quantity,
      subtotal: num(i.subtotal, unitPrice * quantity),
    };
  });

const toSale = (id: string, data: Record<string, unknown>): Sale => {
  const items = toItems(data.items);
  const total = num(data.total);
  return {
    id,
    items,
    subtotal: num(data.subtotal, total),
    discount: num(data.discount),
    total,
    paymentMethod: (['cash', 'transfer', 'card'].includes(str(data.paymentMethod)) ? data.paymentMethod : 'cash') as PaymentMethod,
    status: data.status === 'voided' ? 'voided' : 'paid',
    barberId: strOrNull(data.barberId),
    barberName: str(data.barberName),
    clientId: strOrNull(data.clientId),
    clientName: str(data.clientName),
    appointmentId: strOrNull(data.appointmentId),
    createdBy: str(data.createdBy),
    createdAt: toIso(data.createdAt),
    voidedAt: toIsoOrNull(data.voidedAt),
    voidReason: strOrNull(data.voidReason),
  };
};

const toSaleCost = (id: string, data: Record<string, unknown>): SaleCost => ({
  saleId: id,
  createdAt: toIso(data.createdAt),
  items: (Array.isArray(data.items) ? data.items : []).map((raw) => {
    const i = raw as Record<string, unknown>;
    return {
      refId: str(i.refId),
      type: (i.type === 'service' ? 'service' : 'product') as ItemType,
      quantity: num(i.quantity, 1),
      unitCost: numOrNull(i.unitCost),
    };
  }),
});

const rangeQuery = (name: string, from: string, to: string) =>
  query(
    collection(db, name),
    where('createdAt', '>=', Timestamp.fromDate(toInstant(from, '00:00'))),
    where('createdAt', '<', Timestamp.fromDate(toInstant(addDays(to, 1), '00:00')))
  );

/** Agrupa líneas repetidas para que cada producto se descuente una sola vez. */
const mergeItems = (items: SaleItem[]): SaleItem[] => {
  const map = new Map<string, SaleItem>();
  for (const item of items) {
    const key = `${item.type}:${item.refId}`;
    const prev = map.get(key);
    map.set(key, prev
      ? { ...prev, quantity: prev.quantity + item.quantity, subtotal: prev.subtotal + item.subtotal }
      : { ...item });
  }
  return [...map.values()];
};

export const salesService = {
  async listByRange(from: string, to: string): Promise<Sale[]> {
    const snapshot = await getDocs(rangeQuery(COLLECTION_NAME, from, to));
    return snapshot.docs.map((d) => toSale(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listForBarber(barberId: string): Promise<Sale[]> {
    const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('barberId', '==', barberId)));
    return snapshot.docs.map((d) => toSale(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listForClient(clientId: string): Promise<Sale[]> {
    const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('clientId', '==', clientId)));
    return snapshot.docs.map((d) => toSale(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async costsByRange(from: string, to: string): Promise<Map<string, SaleCost>> {
    const snapshot = await getDocs(rangeQuery('saleCosts', from, to));
    return new Map(snapshot.docs.map((d) => [d.id, toSaleCost(d.id, d.data())]));
  },

  /** Nuevo id de venta. Se genera una vez por cobro para que un doble envío no duplique la venta. */
  newSaleId: () => doc(collection(db, COLLECTION_NAME)).id,

  /**
   * Registra la venta en una transacción: valida y descuenta existencias, captura los costos,
   * registra movimientos de inventario y, si es el cobro de una cita, la vincula (una sola vez).
   */
  async createSale(saleId: string, input: CreateSaleInput, actor: Actor): Promise<void> {
    const items = mergeItems(input.items);
    if (items.length === 0) throw new AppError('empty', 'Agrega al menos un ítem.');
    if (items.length > MAX_SALE_LINES) throw new AppError('too-many', `Máximo ${MAX_SALE_LINES} líneas por venta.`);
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
        throw new AppError('invalid', 'Hay ítems con cantidad o precio inválidos.');
      }
    }
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    if (!Number.isInteger(input.discount) || input.discount < 0 || input.discount > subtotal) {
      throw new AppError('invalid', 'El descuento no puede superar el subtotal.');
    }

    const saleRef = doc(db, COLLECTION_NAME, saleId);
    const products = items.filter((i) => i.type === 'product');
    const services = items.filter((i) => i.type === 'service');

    await runTransaction(db, async (tx) => {
      const saleSnap = await tx.get(saleRef);
      if (saleSnap.exists()) return; // reintento del mismo cobro: ya registrado

      let apptSnap: DocumentSnapshot | null = null;
      if (input.appointmentId) {
        apptSnap = await tx.get(doc(db, 'appointments', input.appointmentId));
        if (!apptSnap.exists()) throw new AppError('not-found', 'La cita no existe.');
        if (apptSnap.data().status !== 'completed') throw new AppError('invalid', 'Solo se cobran citas completadas.');
        if (apptSnap.data().saleId) throw new AppError('duplicate', 'Esta cita ya fue cobrada.');
      }
      const productSnaps = await Promise.all(products.map((p) => tx.get(doc(db, 'products', p.refId))));
      const productCostSnaps = await Promise.all(products.map((p) => tx.get(doc(db, 'productCosts', p.refId))));
      const serviceCostSnaps = await Promise.all(services.map((s) => tx.get(doc(db, 'serviceCosts', s.refId))));

      const costItems: SaleCostItem[] = [];
      products.forEach((p, idx) => {
        const snap = productSnaps[idx];
        if (!snap.exists()) throw new AppError('not-found', `El producto "${p.name}" ya no existe.`);
        const stock = num(snap.data().stock);
        if (stock < p.quantity) throw new AppError('stock', `Existencias insuficientes de "${p.name}" (disponible: ${stock}).`);
        const cost = productCostSnaps[idx];
        costItems.push({ refId: p.refId, type: 'product', quantity: p.quantity, unitCost: cost.exists() ? numOrNull(cost.data().avgCost) : null });
      });
      services.forEach((s, idx) => {
        const cost = serviceCostSnaps[idx];
        costItems.push({ refId: s.refId, type: 'service', quantity: s.quantity, unitCost: cost.exists() ? numOrNull(cost.data().directCost) : null });
      });

      tx.set(saleRef, {
        items,
        subtotal,
        discount: input.discount,
        total: subtotal - input.discount,
        paymentMethod: input.paymentMethod,
        status: 'paid',
        barberId: input.barberId,
        barberName: input.barberName,
        clientId: input.clientId,
        clientName: cleanText(input.clientName, 80),
        appointmentId: input.appointmentId,
        createdBy: actor.uid,
        createdAt: serverTimestamp(),
        voidedAt: null,
        voidReason: null,
      });
      tx.set(doc(db, 'saleCosts', saleId), { items: costItems, createdAt: serverTimestamp() });

      products.forEach((p, idx) => {
        const stockAfter = num(productSnaps[idx].data()?.stock) - p.quantity;
        tx.update(doc(db, 'products', p.refId), { stock: stockAfter });
        tx.set(doc(db, 'inventoryMovements', `${saleId}_${p.refId}`), {
          productId: p.refId,
          productName: p.name,
          type: 'sale',
          quantity: -p.quantity,
          unitCost: costItems[idx].unitCost,
          stockAfter,
          reason: 'Venta',
          refId: saleId,
          createdBy: actor.uid,
          createdAt: serverTimestamp(),
        });
      });
      if (apptSnap) tx.update(apptSnap.ref, { saleId, updatedAt: serverTimestamp() });
      addAudit(tx, actor, 'sale.created', 'sales', saleId, { total: subtotal - input.discount, method: input.paymentMethod });
    });
  },

  /** Anula una venta: deja de contar como ingreso, devuelve existencias y libera la cita. */
  async voidSale(saleId: string, reason: string, actor: Actor): Promise<void> {
    const saleRef = doc(db, COLLECTION_NAME, saleId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(saleRef);
      if (!snap.exists()) throw new AppError('not-found', 'La venta no existe.');
      const sale = toSale(snap.id, snap.data());
      if (sale.status === 'voided') throw new AppError('duplicate', 'La venta ya estaba anulada.');
      const products = sale.items.filter((i) => i.type === 'product');
      const productSnaps = await Promise.all(products.map((p) => tx.get(doc(db, 'products', p.refId))));
      const apptSnap = sale.appointmentId ? await tx.get(doc(db, 'appointments', sale.appointmentId)) : null;

      tx.update(saleRef, {
        status: 'voided',
        voidedAt: serverTimestamp(),
        voidReason: cleanText(reason, 200),
        voidedBy: actor.uid,
      });
      products.forEach((p, idx) => {
        const productSnap = productSnaps[idx];
        if (!productSnap.exists()) return;
        const stockAfter = num(productSnap.data().stock) + p.quantity;
        tx.update(productSnap.ref, { stock: stockAfter });
        tx.set(doc(db, 'inventoryMovements', `${saleId}_${p.refId}_void`), {
          productId: p.refId,
          productName: p.name,
          type: 'sale_void',
          quantity: p.quantity,
          unitCost: null,
          stockAfter,
          reason: 'Anulación de venta',
          refId: saleId,
          createdBy: actor.uid,
          createdAt: serverTimestamp(),
        });
      });
      if (apptSnap?.exists() && apptSnap.data().saleId === saleId) {
        tx.update(apptSnap.ref, { saleId: null, updatedAt: serverTimestamp() });
      }
      addAudit(tx, actor, 'sale.voided', 'sales', saleId, { total: sale.total });
    });
  },
};
