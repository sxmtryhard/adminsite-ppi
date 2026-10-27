/**
 * Reparte en carriles las citas que se cruzan dentro de una misma columna del calendario
 * (p. ej. una cita cancelada y la nueva que ocupó su horario), para que ninguna tape a otra.
 */
export interface CalendarItem {
  id: string;
  start: number; // minutos desde medianoche
  end: number;
}

export interface LanePlacement {
  lane: number;
  lanes: number;
}

export const layoutLanes = (items: CalendarItem[]): Map<string, LanePlacement> => {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const result = new Map<string, LanePlacement>();
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    for (const c of cluster) result.set(c.id, { lane: c.lane, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    cluster.push({ id: item.id, lane });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return result;
};
