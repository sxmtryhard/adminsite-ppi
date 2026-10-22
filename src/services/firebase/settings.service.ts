import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, num, str, type Actor } from './helpers';
import { DEFAULT_SETTINGS, type BusinessSettings } from '@/types/settings.types';

const ref = () => doc(db, 'config', 'business');

export const settingsService = {
  /** Devuelve la configuración guardada o los valores por defecto (marcados como no guardados). */
  async get(): Promise<{ settings: BusinessSettings; saved: boolean }> {
    const snap = await getDoc(ref());
    if (!snap.exists()) return { settings: DEFAULT_SETTINGS, saved: false };
    const d = snap.data();
    return {
      saved: true,
      settings: {
        studioName: str(d.studioName, DEFAULT_SETTINGS.studioName),
        phone: str(d.phone),
        address: str(d.address),
        currency: 'COP',
        timezone: 'America/Bogota',
        cancellationMinHours: num(d.cancellationMinHours, DEFAULT_SETTINGS.cancellationMinHours),
        minLeadMinutes: num(d.minLeadMinutes, DEFAULT_SETTINGS.minLeadMinutes),
        bookingWindowDays: num(d.bookingWindowDays, DEFAULT_SETTINGS.bookingWindowDays),
        defaultMinStock: num(d.defaultMinStock, DEFAULT_SETTINGS.defaultMinStock),
      },
    };
  },

  async save(settings: BusinessSettings, actor: Actor): Promise<void> {
    const batch = writeBatch(db);
    batch.set(ref(), settings);
    addAudit(batch, actor, 'settings.updated', 'config', 'business', {
      cancellationMinHours: settings.cancellationMinHours,
      minLeadMinutes: settings.minLeadMinutes,
      bookingWindowDays: settings.bookingWindowDays,
    });
    await batch.commit();
  },
};
