// Validaciones de entrada compartidas por formularios. Las reglas de Firestore
// repiten las restricciones críticas (tipos, rangos, campos permitidos) en el servidor.

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{7,15}$/;

export const normalizePhone = (value: string): string => value.replace(/[\s()-]/g, '');

export const validateEmail = (value: string): string | undefined =>
  EMAIL_RE.test(value.trim()) ? undefined : 'Ingresa un correo válido.';

export const validatePhone = (value: string): string | undefined =>
  PHONE_RE.test(normalizePhone(value)) ? undefined : 'Ingresa un teléfono válido (7 a 15 dígitos).';

export const validateName = (value: string): string | undefined => {
  const v = value.trim();
  if (v.length < 2) return 'Ingresa al menos 2 caracteres.';
  if (v.length > 80) return 'Máximo 80 caracteres.';
  return undefined;
};

export const validatePassword = (value: string): string | undefined => {
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Usa letras y números.';
  return undefined;
};

export const validateMoney = (value: number, { allowZero = true } = {}): string | undefined => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return 'Ingresa un valor entero en pesos.';
  if (value < 0 || (!allowZero && value === 0)) return 'El valor debe ser mayor que cero.';
  if (value > 100_000_000) return 'Valor fuera de rango.';
  return undefined;
};

export const validateQuantity = (value: number): string | undefined =>
  Number.isInteger(value) && value > 0 && value <= 10_000 ? undefined : 'Cantidad inválida.';

export const hasErrors = (errors: FieldErrors): boolean => Object.values(errors).some(Boolean);

/** Elimina espacios sobrantes y limita la longitud de textos libres. */
export const cleanText = (value: string, max = 300): string => value.trim().replace(/\s+/g, ' ').slice(0, max);
