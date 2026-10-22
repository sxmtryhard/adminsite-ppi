import type { ItemType, Sale, SaleCost } from '@/types/sale.types';
import type { Expense } from '@/types/expense.types';
import type { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { addDays, businessDate, daysBetween } from './time';

/**
 * Reglas contables del sistema
 * - Ingreso reconocido: total de ventas con estado `paid` cuya fecha (zona del negocio) cae en el
 *   periodo. Las ventas anuladas no cuentan (equivale a reembolso total). No hay pagos parciales.
 * - Los descuentos se aplican a nivel de venta: `total = subtotal - descuento`. El ingreso por
 *   línea se prorratea en proporción a su subtotal.
 * - Costos directos: costo del servicio (configurado por el administrador) y costo de los productos
 *   vendidos (promedio ponderado al momento de la venta), capturados en `saleCosts`.
 *   Un costo no configurado no se inventa: se cuenta como 0 y el resumen queda marcado incompleto.
 * - Gastos operativos: gastos `active` cuya fecha cae en el periodo.
 */

export interface Period {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

export interface FinanceSummary {
  revenue: number;
  serviceRevenue: number;
  productRevenue: number;
  discounts: number;
  serviceCosts: number;
  cogs: number;
  directCosts: number;
  grossProfit: number;
  grossMarginPct: number | null;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number | null;
  paidSalesCount: number;
  voidedSalesCount: number;
  voidedAmount: number;
  averageTicket: number | null;
  /** false si alguna línea vendida no tiene costo configurado. */
  costsComplete: boolean;
  itemsMissingCost: number;
}

export const saleDate = (sale: Pick<Sale, 'createdAt'>): string => businessDate(new Date(sale.createdAt));

export const inPeriod = (date: string, period: Period): boolean => date >= period.from && date <= period.to;

/** Porcentaje con protección ante ingresos cero (devuelve null: "no aplica"). */
export const marginPct = (profit: number, revenue: number): number | null =>
  revenue > 0 ? (profit / revenue) * 100 : null;

/** Factor para prorratear el descuento de una venta sobre sus líneas. */
const netFactor = (sale: Pick<Sale, 'subtotal' | 'total'>): number =>
  sale.subtotal > 0 ? sale.total / sale.subtotal : 0;

export const computeFinancials = (
  sales: Sale[],
  costs: Map<string, SaleCost>,
  expenses: Expense[],
  period: Period
): FinanceSummary => {
  let revenue = 0;
  let serviceRevenue = 0;
  let productRevenue = 0;
  let discounts = 0;
  let serviceCosts = 0;
  let cogs = 0;
  let paidSalesCount = 0;
  let voidedSalesCount = 0;
  let voidedAmount = 0;
  let itemsMissingCost = 0;

  for (const sale of sales) {
    if (!inPeriod(saleDate(sale), period)) continue;
    if (sale.status === 'voided') {
      voidedSalesCount += 1;
      voidedAmount += sale.total;
      continue;
    }
    paidSalesCount += 1;
    revenue += sale.total;
    discounts += sale.discount;

    const factor = netFactor(sale);
    for (const item of sale.items) {
      const net = item.subtotal * factor;
      if (item.type === 'service') serviceRevenue += net;
      else productRevenue += net;
    }

    const cost = costs.get(sale.id);
    for (const item of sale.items) {
      const costItem = cost?.items.find((c) => c.refId === item.refId && c.type === item.type);
      if (!costItem || costItem.unitCost === null) {
        itemsMissingCost += 1;
        continue;
      }
      const lineCost = costItem.unitCost * item.quantity;
      if (item.type === 'service') serviceCosts += lineCost;
      else cogs += lineCost;
    }
  }

  const operatingExpenses = expenses
    .filter((e) => e.status === 'active' && inPeriod(e.date, period))
    .reduce((sum, e) => sum + e.amount, 0);

  const directCosts = serviceCosts + cogs;
  const grossProfit = revenue - directCosts;
  const netProfit = grossProfit - operatingExpenses;

  return {
    revenue,
    serviceRevenue,
    productRevenue,
    discounts,
    serviceCosts,
    cogs,
    directCosts,
    grossProfit,
    grossMarginPct: marginPct(grossProfit, revenue),
    operatingExpenses,
    netProfit,
    netMarginPct: marginPct(netProfit, revenue),
    paidSalesCount,
    voidedSalesCount,
    voidedAmount,
    averageTicket: paidSalesCount > 0 ? revenue / paidSalesCount : null,
    costsComplete: itemsMissingCost === 0,
    itemsMissingCost,
  };
};

/** Variación porcentual frente al periodo anterior. null si el periodo anterior es 0. */
export const changePct = (current: number, previous: number): number | null =>
  previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null;

export interface RankedItem {
  refId: string;
  name: string;
  type: ItemType;
  quantity: number;
  revenue: number;
  cost: number | null;
  profit: number | null;
}

/** Ranking de servicios/productos vendidos, con rentabilidad por línea cuando hay costos. */
export const rankItems = (
  sales: Sale[],
  costs: Map<string, SaleCost>,
  period: Period,
  type: ItemType
): RankedItem[] => {
  const map = new Map<string, RankedItem & { missingCost: boolean }>();
  for (const sale of sales) {
    if (sale.status !== 'paid' || !inPeriod(saleDate(sale), period)) continue;
    const factor = netFactor(sale);
    const saleCost = costs.get(sale.id);
    for (const item of sale.items) {
      if (item.type !== type) continue;
      const entry =
        map.get(item.refId) ??
        { refId: item.refId, name: item.name, type, quantity: 0, revenue: 0, cost: 0, profit: null, missingCost: false };
      entry.quantity += item.quantity;
      entry.revenue += item.subtotal * factor;
      const unitCost = saleCost?.items.find((c) => c.refId === item.refId && c.type === type)?.unitCost;
      if (unitCost === undefined || unitCost === null) entry.missingCost = true;
      else entry.cost = (entry.cost ?? 0) + unitCost * item.quantity;
      map.set(item.refId, entry);
    }
  }
  return [...map.values()]
    .map(({ missingCost, ...e }) => ({
      ...e,
      cost: missingCost ? null : e.cost,
      profit: missingCost || e.cost === null ? null : e.revenue - e.cost,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
};

export interface BarberPerformance {
  barberId: string;
  barberName: string;
  servicesCount: number;
  serviceRevenue: number;
  productRevenue: number;
  completedAppointments: number;
}

export const barberPerformance = (
  sales: Sale[],
  appointments: Appointment[],
  period: Period
): BarberPerformance[] => {
  const map = new Map<string, BarberPerformance>();
  const get = (id: string, name: string) => {
    const existing = map.get(id);
    if (existing) return existing;
    const created = { barberId: id, barberName: name, servicesCount: 0, serviceRevenue: 0, productRevenue: 0, completedAppointments: 0 };
    map.set(id, created);
    return created;
  };
  for (const sale of sales) {
    if (sale.status !== 'paid' || !sale.barberId || !inPeriod(saleDate(sale), period)) continue;
    const entry = get(sale.barberId, sale.barberName);
    const factor = netFactor(sale);
    for (const item of sale.items) {
      if (item.type === 'service') {
        entry.servicesCount += item.quantity;
        entry.serviceRevenue += item.subtotal * factor;
      } else {
        entry.productRevenue += item.subtotal * factor;
      }
    }
  }
  for (const appt of appointments) {
    if (appt.status === 'completed' && inPeriod(appt.date, period)) {
      get(appt.barberId, appt.barberName).completedAppointments += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.serviceRevenue - a.serviceRevenue);
};

export interface DailyPoint {
  date: string;
  revenue: number;
  directCosts: number;
  expenses: number;
}

export const dailySeries = (
  sales: Sale[],
  costs: Map<string, SaleCost>,
  expenses: Expense[],
  period: Period
): DailyPoint[] => {
  const length = daysBetween(period.from, period.to) + 1;
  const points = new Map<string, DailyPoint>();
  for (let i = 0; i < length; i++) {
    const date = addDays(period.from, i);
    points.set(date, { date, revenue: 0, directCosts: 0, expenses: 0 });
  }
  for (const sale of sales) {
    if (sale.status !== 'paid') continue;
    const point = points.get(saleDate(sale));
    if (!point) continue;
    point.revenue += sale.total;
    for (const c of costs.get(sale.id)?.items ?? []) {
      if (c.unitCost !== null) point.directCosts += c.unitCost * c.quantity;
    }
  }
  for (const e of expenses) {
    const point = points.get(e.date);
    if (point && e.status === 'active') point.expenses += e.amount;
  }
  return [...points.values()];
};

export const countByStatus = (
  appointments: Appointment[],
  period: Period
): Record<AppointmentStatus, number> => {
  const counts: Record<AppointmentStatus, number> = {
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };
  for (const a of appointments) if (inPeriod(a.date, period)) counts[a.status] += 1;
  return counts;
};

export type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'prev_month';

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Hoy',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  month: 'Este mes',
  prev_month: 'Mes anterior',
};

export const periodFromPreset = (preset: PeriodPreset, today: string): Period => {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'prev_month': {
      const firstThis = `${today.slice(0, 7)}-01`;
      const lastPrev = addDays(firstThis, -1);
      return { from: `${lastPrev.slice(0, 7)}-01`, to: lastPrev };
    }
  }
};

/** Periodo inmediatamente anterior con la misma cantidad de días. */
export const previousPeriod = (period: Period): Period => {
  const length = daysBetween(period.from, period.to) + 1;
  return { from: addDays(period.from, -length), to: addDays(period.from, -1) };
};

/** Comisión de un barbero: solo si existe política configurada. */
export const commission = (serviceRevenue: number, rate: number | null): number | null =>
  rate === null ? null : (serviceRevenue * rate) / 100;
