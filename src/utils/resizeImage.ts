/** Lado máximo del logo guardado; suficiente para el menú, el login y el comprobante. */
const LOGO_SIZE = 256;
/** Tope del texto base64 (≈ 110 KB de imagen). Replicado en firestore.rules. */
export const MAX_LOGO_CHARS = 150_000;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const LOGO_RE = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/;
export const isLogoDataUrl = (value: string): boolean => LOGO_RE.test(value);

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen. Prueba con una foto JPG o PNG.'));
    };
    img.src = url;
  });

/**
 * Reduce una foto a un logo cuadrado de 256 px (la imagen completa, centrada, sin recortar)
 * y la devuelve como data URL WebP, o PNG si el navegador no codifica WebP.
 */
export const imageToLogo = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('La imagen supera 10 MB.');
  const img = await loadImage(file);
  const scale = Math.min(LOGO_SIZE / img.naturalWidth, LOGO_SIZE / img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = LOGO_SIZE;
  canvas.height = LOGO_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite procesar imágenes.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (LOGO_SIZE - w) / 2, (LOGO_SIZE - h) / 2, w, h);

  for (const quality of [0.9, 0.75, 0.6]) {
    const webp = canvas.toDataURL('image/webp', quality);
    const out = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
    if (out.length <= MAX_LOGO_CHARS) return out;
  }
  throw new Error('La imagen es demasiado compleja. Prueba con un logo más simple.');
};
