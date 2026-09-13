import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { Sale, CreateSaleDTO } from '@/types/sale.types';

const COLLECTION_NAME = 'sales';

export const salesService = {
  async getSales(): Promise<Sale[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          items: data.items || [],
          total: data.total || 0,
          paymentMethod: data.paymentMethod || 'cash',
          barberName: data.barberName || '',
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Sale;
      });

      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      console.error('Error en getSales:', error);
      return [];
    }
  },

  async createSale(dto: CreateSaleDTO): Promise<string> {
    try {
      // Formatear items limpiando propiedades no deseadas
      const sanitizedItems = dto.items.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        subtotal: Number(item.subtotal) || 0,
      }));

      // Evitar enviar cualquier propiedad como undefined a Firestore
      const salePayload = {
        items: sanitizedItems,
        total: Number(dto.total) || 0,
        paymentMethod: dto.paymentMethod || 'cash',
        barberName: dto.barberName ? dto.barberName.trim() : '',
        notes: dto.notes ? dto.notes.trim() : '',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), salePayload);

      // Descontar inventario únicamente para ítems de tipo producto
      for (const item of sanitizedItems) {
        if (item.type === 'product' && item.id) {
          try {
            const prodRef = doc(db, 'products', item.id);
            await updateDoc(prodRef, {
              stock: increment(-item.quantity),
            });
          } catch (stockErr) {
            console.warn(`No se pudo actualizar stock del producto ${item.id}:`, stockErr);
          }
        }
      }

      return docRef.id;
    } catch (error) {
      console.error('Error detallado en createSale:', error);
      throw error;
    }
  },
};