import { doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, AppError, type Actor } from './helpers';
import { isLogoDataUrl, MAX_LOGO_CHARS } from '@/utils/resizeImage';

/**
 * Logo del local en `branding/current`. Es de lectura pública (se ve en el login y en la página
 * de instalación, antes de iniciar sesión) y solo el administrador puede cambiarlo.
 * Se guarda como imagen pequeña en base64 porque Cloud Storage exige el plan de pago.
 */
const ref = () => doc(db, 'branding', 'current');

export const brandingService = {
  subscribe(onChange: (logo: string | null) => void): () => void {
    return onSnapshot(
      ref(),
      (snap) => {
        const logo = snap.data()?.logo;
        onChange(typeof logo === 'string' && isLogoDataUrl(logo) ? logo : null);
      },
      () => onChange(null)
    );
  },

  async setLogo(logo: string | null, actor: Actor): Promise<void> {
    if (logo !== null && (!isLogoDataUrl(logo) || logo.length > MAX_LOGO_CHARS)) {
      throw new AppError('invalid-logo', 'La imagen no es válida o es demasiado grande.');
    }
    const batch = writeBatch(db);
    batch.set(ref(), { logo, updatedAt: serverTimestamp(), updatedBy: actor.uid });
    addAudit(batch, actor, 'branding.updated', 'branding', 'current', { removed: logo === null });
    await batch.commit();
  },
};
