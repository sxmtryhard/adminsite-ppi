import { describe, expect, it } from 'vitest';
import { cleanText, validateEmail, validateMoney, validatePassword, validatePhone, validateQuantity } from './validation';

describe('validation', () => {
  it('valida correo y teléfono', () => {
    expect(validateEmail('ana@xac.co')).toBeUndefined();
    expect(validateEmail('ana@')).toBeDefined();
    expect(validatePhone('+57 300 123 4567')).toBeUndefined();
    expect(validatePhone('12ab')).toBeDefined();
  });

  it('exige contraseñas con letras y números', () => {
    expect(validatePassword('corta1')).toBeDefined();
    expect(validatePassword('solamenteletras')).toBeDefined();
    expect(validatePassword('segura123')).toBeUndefined();
  });

  it('valida montos y cantidades', () => {
    expect(validateMoney(1000)).toBeUndefined();
    expect(validateMoney(-1)).toBeDefined();
    expect(validateMoney(10.5)).toBeDefined();
    expect(validateMoney(0, { allowZero: false })).toBeDefined();
    expect(validateQuantity(0)).toBeDefined();
    expect(validateQuantity(3)).toBeUndefined();
  });

  it('limpia texto libre', () => {
    expect(cleanText('  hola    mundo  ')).toBe('hola mundo');
    expect(cleanText('abcdef', 3)).toBe('abc');
  });
});
