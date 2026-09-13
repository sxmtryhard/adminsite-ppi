import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { Product, CreateProductDTO } from '@/types/product.types';

const COLLECTION_NAME = 'products';

export const productsService = {
  async getProducts(): Promise<Product[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          description: data.description || '',
          category: data.category || 'otros',
          costPrice: data.costPrice || 0,
          salePrice: data.salePrice || 0,
          stock: data.stock ?? 0,
          minStock: data.minStock ?? 5,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Product;
      });

      return list.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      throw new Error('No fue posible cargar los productos.');
    }
  },

  async createProduct(dto: CreateProductDTO): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...dto,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch {
      throw new Error('No fue posible crear el producto.');
    }
  },

  async updateStock(id: string, delta: number): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        stock: increment(delta),
      });
    } catch {
      throw new Error('No fue posible actualizar el stock.');
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch {
      throw new Error('No fue posible eliminar el producto.');
    }
  },
};