import { describe, expect, it } from 'vitest';
import { isLogoDataUrl } from './resizeImage';

describe('isLogoDataUrl', () => {
  it('acepta imágenes WebP, PNG y JPEG en base64', () => {
    expect(isLogoDataUrl('data:image/webp;base64,UklGRg==')).toBe(true);
    expect(isLogoDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isLogoDataUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
  });

  it('rechaza SVG, otros esquemas y contenido inyectado', () => {
    expect(isLogoDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isLogoDataUrl('https://example.com/logo.png')).toBe(false);
    expect(isLogoDataUrl('data:image/png;base64,abc" onerror="alert(1)')).toBe(false);
  });
});
