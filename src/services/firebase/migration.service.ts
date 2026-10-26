import { collection, deleteField, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, num, numOrNull, str, type Actor } from './helpers';

/**
 * Adapta documentos creados con la versión anterior al esquema actual:
 * - Productos: el costo (`costPrice`) estaba en el catálogo público. Se mueve a `productCosts`
 *   (privado) como costo promedio y se elimina del catálogo.
 * - Barberos: el teléfono estaba en el documento público. Se mueve a `barberPrivate` y se
 *   completan los campos nuevos (`userId`, `blockedDates`). El horario NO se inventa: lo define
 *   el negocio en Barberos › Horario.
 * Es idempotente: si ya existe el documento privado, no se sobrescribe su costo.
 */

export interface MigrationScan {
  products: { id: string; name: string; costPrice: number }[];
  barbers: { id: string; name: string; hasPhone: boolean }[];
}

export const migrationService = {
  async scan(): Promise<MigrationScan> {
    const [products, barbers] = await Promise.all([getDocs(collection(db, 'products')), getDocs(collection(db, 'barbers'))]);
    return {
      products: products.docs
        .filter((d) => d.data().costPrice !== undefined)
        .map((d) => ({ id: d.id, name: str(d.data().name), costPrice: num(d.data().costPrice) })),
      barbers: barbers.docs
        .filter((d) => {
          const data = d.data();
          return data.phone !== undefined || data.userId === undefined || !Array.isArray(data.blockedDates);
        })
        .map((d) => ({ id: d.id, name: str(d.data().fullName), hasPhone: d.data().phone !== undefined })),
    };
  },

  async run(actor: Actor): Promise<{ products: number; barbers: number }> {
    const found = await this.scan();
    const batch = writeBatch(db);

    for (const p of found.products) {
      const costRef = doc(db, 'productCosts', p.id);
      const existing = await getDoc(costRef);
      if (!existing.exists() || numOrNull(existing.data().avgCost) === null) {
        batch.set(costRef, { avgCost: p.costPrice > 0 ? p.costPrice : null });
      }
      batch.update(doc(db, 'products', p.id), { costPrice: deleteField() });
    }

    for (const b of found.barbers) {
      const barberRef = doc(db, 'barbers', b.id);
      const [barberSnap, privateSnap] = await Promise.all([getDoc(barberRef), getDoc(doc(db, 'barberPrivate', b.id))]);
      const data = barberSnap.data() ?? {};
      const previous = privateSnap.exists() ? privateSnap.data() : {};
      batch.set(doc(db, 'barberPrivate', b.id), {
        phone: str(previous.phone) || str(data.phone),
        commissionRate: numOrNull(previous.commissionRate),
      });
      batch.update(barberRef, {
        phone: deleteField(),
        ...(data.userId === undefined ? { userId: null } : {}),
        ...(!Array.isArray(data.blockedDates) ? { blockedDates: [] } : {}),
      });
    }

    if (found.products.length || found.barbers.length) {
      addAudit(batch, actor, 'data.migrated', 'config', 'migration', {
        products: found.products.length,
        barbers: found.barbers.length,
      });
      await batch.commit();
    }
    return { products: found.products.length, barbers: found.barbers.length };
  },
};
