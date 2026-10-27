import { describe, expect, it } from 'vitest';
import { layoutLanes } from './calendarLayout';

describe('layoutLanes', () => {
  it('deja en un solo carril las citas que no se cruzan', () => {
    const out = layoutLanes([
      { id: 'a', start: 600, end: 630 },
      { id: 'b', start: 630, end: 660 },
    ]);
    expect(out.get('a')).toEqual({ lane: 0, lanes: 1 });
    expect(out.get('b')).toEqual({ lane: 0, lanes: 1 });
  });

  it('pone lado a lado las citas que se cruzan', () => {
    const out = layoutLanes([
      { id: 'a', start: 660, end: 720 },
      { id: 'b', start: 660, end: 690 },
    ]);
    expect(out.get('b')).toEqual({ lane: 0, lanes: 2 });
    expect(out.get('a')).toEqual({ lane: 1, lanes: 2 });
  });

  it('reutiliza un carril libre dentro del mismo grupo', () => {
    const out = layoutLanes([
      { id: 'a', start: 600, end: 720 },
      { id: 'b', start: 600, end: 630 },
      { id: 'c', start: 640, end: 700 },
    ]);
    expect(out.get('a')).toEqual({ lane: 1, lanes: 2 });
    expect(out.get('c')).toEqual({ lane: 0, lanes: 2 });
  });
});
