import { describe, expect, it } from 'vitest';
import type { WeeklySchedule } from '@/types/barber.types';
import { availableStartTimes, hasWorkingDays, isValidDaySchedule, mergeTimes, pickAnyBarber, slotCount, slotKeysFor, type AvailabilityInput } from './availability';
import { businessDate, businessMinutes, startOfWeek, toInstant } from './time';

// 2026-10-26 es lunes.
const MONDAY = '2026-10-26';
const schedule: WeeklySchedule = {
  '1': { start: '09:00', end: '12:00', breakStart: '10:00', breakEnd: '10:30' },
  '0': null,
};

const base: AvailabilityInput = {
  barberId: 'b1',
  schedule,
  blockedDates: [],
  date: MONDAY,
  durationMinutes: 30,
  takenSlots: new Set(),
  today: '2026-10-22',
  nowMinutes: 0,
  minLeadMinutes: 60,
  lastBookableDate: '2026-11-30',
};

describe('slots', () => {
  it('redondea la duración hacia arriba a franjas de 15 minutos', () => {
    expect(slotCount(15)).toBe(1);
    expect(slotCount(40)).toBe(3);
    expect(slotKeysFor('b1', MONDAY, '09:30', 40)).toEqual([
      'b1_2026-10-26_0930',
      'b1_2026-10-26_0945',
      'b1_2026-10-26_1000',
    ]);
  });
});

describe('availableStartTimes', () => {
  it('respeta jornada y descanso', () => {
    expect(availableStartTimes(base)).toEqual([
      '09:00', '09:15', '09:30',
      '10:30', '10:45', '11:00', '11:15', '11:30',
    ]);
  });

  it('excluye horarios que se superponen con franjas ocupadas', () => {
    const taken = new Set(slotKeysFor('b1', MONDAY, '11:00', 30));
    const times = availableStartTimes({ ...base, takenSlots: taken });
    expect(times).not.toContain('10:45'); // 10:45-11:15 choca
    expect(times).not.toContain('11:00');
    expect(times).not.toContain('11:15');
    expect(times).toContain('11:30');
    expect(times).toContain('10:30');
  });

  it('libera las franjas de la cita que se reprograma', () => {
    const own = new Set(slotKeysFor('b1', MONDAY, '11:00', 30));
    const times = availableStartTimes({ ...base, takenSlots: own, ignoreSlots: own });
    expect(times).toContain('11:00');
  });

  it('no ofrece días no laborables, bloqueados, pasados o fuera de ventana', () => {
    expect(availableStartTimes({ ...base, date: '2026-10-25' })).toEqual([]); // domingo null
    expect(availableStartTimes({ ...base, date: '2026-10-27' })).toEqual([]); // martes sin horario
    expect(availableStartTimes({ ...base, blockedDates: [MONDAY] })).toEqual([]);
    expect(availableStartTimes({ ...base, today: '2026-10-27' })).toEqual([]);
    expect(availableStartTimes({ ...base, lastBookableDate: '2026-10-25' })).toEqual([]);
  });

  it('aplica la antelación mínima el mismo día', () => {
    const times = availableStartTimes({ ...base, today: MONDAY, nowMinutes: 9 * 60 + 40 });
    expect(times[0]).toBe('10:45'); // 9:40 + 60 = 10:40 → primer inicio en grilla libre
  });

  it('rechaza servicios que no caben en la jornada', () => {
    expect(availableStartTimes({ ...base, durationMinutes: 200 })).toEqual([]);
  });
});

describe('isValidDaySchedule', () => {
  it('valida rangos y descansos', () => {
    expect(isValidDaySchedule({ start: '09:00', end: '18:00' })).toBe(true);
    expect(isValidDaySchedule({ start: '18:00', end: '09:00' })).toBe(false);
    expect(isValidDaySchedule({ start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: null })).toBe(false);
    expect(isValidDaySchedule({ start: '09:00', end: '18:00', breakStart: '08:00', breakEnd: '09:30' })).toBe(false);
  });
});

describe('zona horaria', () => {
  it('convierte entre hora local del negocio e instante absoluto', () => {
    const instant = toInstant('2026-10-26', '09:00');
    expect(instant.toISOString()).toBe('2026-10-26T14:00:00.000Z');
    expect(businessDate(instant)).toBe('2026-10-26');
    expect(businessMinutes(instant)).toBe(540);
  });
});

describe('cualquier barbero', () => {
  const options = [
    { barber: { id: 'b1', fullName: 'Ana' }, times: ['09:00', '10:00'] },
    { barber: { id: 'b2', fullName: 'Luis' }, times: ['09:00', '10:00', '11:00'] },
    { barber: { id: 'b3', fullName: 'Carla' }, times: ['12:00'] },
  ];
  it('asigna al barbero menos ocupado que tenga libre la hora', () => {
    expect(pickAnyBarber(options, '09:00')?.barber.id).toBe('b2');
    expect(pickAnyBarber(options, '12:00')?.barber.id).toBe('b3');
    expect(pickAnyBarber(options, '15:00')).toBeNull();
  });
  it('une los horarios sin duplicados', () => {
    expect(mergeTimes(options)).toEqual(['09:00', '10:00', '11:00', '12:00']);
  });
});

describe('hasWorkingDays', () => {
  it('detecta barberos sin jornada configurada (p. ej. creados con la versión anterior)', () => {
    expect(hasWorkingDays(schedule)).toBe(true);
    expect(hasWorkingDays({})).toBe(false);
    expect(hasWorkingDays({ '1': null, '2': { start: '18:00', end: '09:00' } })).toBe(false);
  });
});

describe('startOfWeek', () => {
  it('devuelve el lunes de la semana (domingo pertenece a la semana anterior)', () => {
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26');
    expect(startOfWeek('2026-10-29')).toBe('2026-10-26');
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
  });
});
