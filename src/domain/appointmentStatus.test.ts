import { describe, expect, it } from 'vitest';
import { canTransition, clientCanModify, nextStatuses, releasesSlots } from './appointmentStatus';

describe('transiciones de estado', () => {
  it('sigue el flujo pendiente → confirmada → en curso → completada', () => {
    expect(canTransition('pending', 'confirmed', 'barber')).toBe(true);
    expect(canTransition('confirmed', 'in_progress', 'barber')).toBe(true);
    expect(canTransition('in_progress', 'completed', 'barber')).toBe(true);
  });

  it('impide saltos y reabrir estados finales', () => {
    expect(canTransition('pending', 'completed', 'admin')).toBe(false);
    expect(canTransition('completed', 'pending', 'admin')).toBe(false);
    expect(canTransition('cancelled', 'confirmed', 'admin')).toBe(false);
    expect(nextStatuses('no_show', 'admin')).toEqual([]);
  });

  it('el cliente solo puede cancelar citas que no han empezado', () => {
    expect(nextStatuses('pending', 'client')).toEqual(['cancelled']);
    expect(nextStatuses('confirmed', 'client')).toEqual(['cancelled']);
    expect(nextStatuses('in_progress', 'client')).toEqual([]);
    expect(canTransition('pending', 'confirmed', 'client')).toBe(false);
  });

  it('solo los estados finales liberan franjas', () => {
    expect(releasesSlots('cancelled')).toBe(true);
    expect(releasesSlots('completed')).toBe(true);
    expect(releasesSlots('confirmed')).toBe(false);
  });
});

describe('política de cancelación', () => {
  const start = new Date('2026-10-26T14:00:00Z');
  it('permite modificar con antelación suficiente', () => {
    expect(clientCanModify(start, new Date('2026-10-26T10:00:00Z'), 3)).toBe(true);
    expect(clientCanModify(start, new Date('2026-10-26T11:00:00Z'), 3)).toBe(true);
    expect(clientCanModify(start, new Date('2026-10-26T11:00:01Z'), 3)).toBe(false);
  });
});
