import { describe, expect, it } from 'vitest';
import type { Sale, SaleCost } from '@/types/sale.types';
import type { Expense } from '@/types/expense.types';
import type { Appointment } from '@/types/appointment.types';
import {
  barberPerformance,
  changePct,
  commission,
  computeFinancials,
  countByStatus,
  dailySeries,
  marginPct,
  periodFromPreset,
  previousPeriod,
  rankItems,
} from './finance';

// 15:00 UTC = 10:00 en Bogotá, mismo día calendario.
const at = (date: string) => `${date}T15:00:00.000Z`;

const sale = (over: Partial<Sale> & Pick<Sale, 'id' | 'items'>): Sale => {
  const subtotal = over.items.reduce((s, i) => s + i.subtotal, 0);
  const discount = over.discount ?? 0;
  return {
    subtotal,
    discount,
    total: subtotal - discount,
    paymentMethod: 'cash',
    status: 'paid',
    barberId: 'b1',
    barberName: 'Ana',
    clientId: null,
    clientName: '',
    appointmentId: null,
    createdBy: 'admin',
    createdAt: at('2026-10-10'),
    voidedAt: null,
    voidReason: null,
    ...over,
  };
};

const svc = (refId: string, unitPrice: number, quantity = 1) => ({
  refId, type: 'service' as const, name: refId, unitPrice, quantity, subtotal: unitPrice * quantity,
});
const prod = (refId: string, unitPrice: number, quantity = 1) => ({
  refId, type: 'product' as const, name: refId, unitPrice, quantity, subtotal: unitPrice * quantity,
});

const costOf = (saleId: string, items: SaleCost['items']): [string, SaleCost] => [
  saleId,
  { saleId, items, createdAt: at('2026-10-10') },
];

const expense = (amount: number, date = '2026-10-10', status: Expense['status'] = 'active'): Expense => ({
  id: `e${amount}`, date, category: 'rent', description: '', amount, status, createdBy: 'admin', createdAt: at(date),
});

const period = { from: '2026-10-01', to: '2026-10-31' };

describe('computeFinancials', () => {
  it('calcula ingresos, costos, utilidad y márgenes de un caso conocido', () => {
    const sales = [
      sale({ id: 's1', items: [svc('corte', 30000), prod('cera', 20000, 2)] }), // 70.000
      sale({ id: 's2', items: [svc('barba', 20000)], discount: 2000 }), // 18.000
    ];
    const costs = new Map([
      costOf('s1', [
        { refId: 'corte', type: 'service', quantity: 1, unitCost: 5000 },
        { refId: 'cera', type: 'product', quantity: 2, unitCost: 8000 },
      ]),
      costOf('s2', [{ refId: 'barba', type: 'service', quantity: 1, unitCost: 3000 }]),
    ]);
    const r = computeFinancials(sales, costs, [expense(20000)], period);

    expect(r.revenue).toBe(88000);
    expect(r.discounts).toBe(2000);
    expect(r.serviceCosts).toBe(8000);
    expect(r.cogs).toBe(16000);
    expect(r.directCosts).toBe(24000);
    expect(r.grossProfit).toBe(64000); // 88.000 − 24.000
    expect(r.grossMarginPct).toBeCloseTo((64000 / 88000) * 100, 10);
    expect(r.operatingExpenses).toBe(20000);
    expect(r.netProfit).toBe(44000); // 88.000 − 24.000 − 20.000
    expect(r.netMarginPct).toBeCloseTo(50, 10);
    expect(r.averageTicket).toBe(44000);
    expect(r.costsComplete).toBe(true);
    expect(r.serviceRevenue + r.productRevenue).toBeCloseTo(r.revenue, 6);
  });

  it('excluye ventas anuladas y las reporta aparte (no se cuentan dos veces)', () => {
    const sales = [
      sale({ id: 's1', items: [svc('corte', 30000)] }),
      sale({ id: 's2', items: [svc('corte', 30000)], status: 'voided' }),
    ];
    const r = computeFinancials(sales, new Map(), [], period);
    expect(r.revenue).toBe(30000);
    expect(r.paidSalesCount).toBe(1);
    expect(r.voidedSalesCount).toBe(1);
    expect(r.voidedAmount).toBe(30000);
  });

  it('marca incompleto cuando falta un costo y no lo inventa', () => {
    const sales = [sale({ id: 's1', items: [svc('corte', 30000), prod('cera', 20000)] })];
    const costs = new Map([
      costOf('s1', [
        { refId: 'corte', type: 'service', quantity: 1, unitCost: null },
        { refId: 'cera', type: 'product', quantity: 1, unitCost: 8000 },
      ]),
    ]);
    const r = computeFinancials(sales, costs, [], period);
    expect(r.costsComplete).toBe(false);
    expect(r.itemsMissingCost).toBe(1);
    expect(r.directCosts).toBe(8000);
  });

  it('con ingresos cero los márgenes y el ticket son null (no aplica)', () => {
    const r = computeFinancials([], new Map(), [expense(10000)], period);
    expect(r.revenue).toBe(0);
    expect(r.grossMarginPct).toBeNull();
    expect(r.netMarginPct).toBeNull();
    expect(r.averageTicket).toBeNull();
    expect(r.netProfit).toBe(-10000);
  });

  it('respeta los límites del periodo y la zona horaria del negocio', () => {
    // 2026-11-01T03:00Z es 2026-10-31 22:00 en Bogotá → pertenece a octubre.
    const late = sale({ id: 's1', items: [svc('corte', 10000)], createdAt: '2026-11-01T03:00:00.000Z' });
    // 2026-10-01T04:00Z es 2026-09-30 23:00 en Bogotá → fuera de octubre.
    const early = sale({ id: 's2', items: [svc('corte', 10000)], createdAt: '2026-10-01T04:00:00.000Z' });
    const r = computeFinancials([late, early], new Map(), [expense(5000, '2026-09-30'), expense(1000, '2026-10-01', 'voided')], period);
    expect(r.revenue).toBe(10000);
    expect(r.operatingExpenses).toBe(0);
  });
});

describe('indicadores derivados', () => {
  it('marginPct y changePct manejan divisores cero', () => {
    expect(marginPct(10, 0)).toBeNull();
    expect(marginPct(25, 100)).toBe(25);
    expect(changePct(150, 100)).toBe(50);
    expect(changePct(50, 0)).toBeNull();
    expect(changePct(-50, -100)).toBe(50);
  });

  it('commission requiere política configurada', () => {
    expect(commission(100000, null)).toBeNull();
    expect(commission(100000, 40)).toBe(40000);
  });

  it('rankItems ordena por cantidad y calcula rentabilidad por línea', () => {
    const sales = [
      sale({ id: 's1', items: [svc('corte', 30000, 2), svc('barba', 20000)] }),
      sale({ id: 's2', items: [svc('corte', 30000)] }),
    ];
    const costs = new Map([
      costOf('s1', [
        { refId: 'corte', type: 'service', quantity: 2, unitCost: 5000 },
        { refId: 'barba', type: 'service', quantity: 1, unitCost: null },
      ]),
      costOf('s2', [{ refId: 'corte', type: 'service', quantity: 1, unitCost: 5000 }]),
    ]);
    const [first, second] = rankItems(sales, costs, period, 'service');
    expect(first).toMatchObject({ refId: 'corte', quantity: 3, revenue: 90000, cost: 15000, profit: 75000 });
    expect(second).toMatchObject({ refId: 'barba', quantity: 1, cost: null, profit: null });
  });

  it('barberPerformance agrupa ventas y citas completadas por barbero', () => {
    const sales = [
      sale({ id: 's1', items: [svc('corte', 30000), prod('cera', 10000)] }),
      sale({ id: 's2', items: [svc('corte', 30000)], barberId: 'b2', barberName: 'Luis' }),
    ];
    const appts = [
      { id: 'a1', barberId: 'b1', barberName: 'Ana', status: 'completed', date: '2026-10-10' },
      { id: 'a2', barberId: 'b1', barberName: 'Ana', status: 'cancelled', date: '2026-10-10' },
    ] as Appointment[];
    const result = barberPerformance(sales, appts, period);
    const ana = result.find((b) => b.barberId === 'b1');
    expect(ana).toMatchObject({ servicesCount: 1, serviceRevenue: 30000, productRevenue: 10000, completedAppointments: 1 });
    expect(result).toHaveLength(2);
  });

  it('dailySeries crea un punto por día del periodo', () => {
    const series = dailySeries([sale({ id: 's1', items: [svc('corte', 30000)] })], new Map(), [expense(5000)], {
      from: '2026-10-09',
      to: '2026-10-11',
    });
    expect(series.map((p) => p.date)).toEqual(['2026-10-09', '2026-10-10', '2026-10-11']);
    expect(series[1]).toMatchObject({ revenue: 30000, expenses: 5000 });
  });

  it('countByStatus cuenta solo citas del periodo', () => {
    const appts = [
      { status: 'completed', date: '2026-10-02' },
      { status: 'cancelled', date: '2026-10-03' },
      { status: 'pending', date: '2026-11-01' },
    ] as Appointment[];
    const c = countByStatus(appts, period);
    expect(c.completed).toBe(1);
    expect(c.cancelled).toBe(1);
    expect(c.pending).toBe(0);
  });
});

describe('periodos', () => {
  it('calcula presets y el periodo anterior equivalente', () => {
    expect(periodFromPreset('month', '2026-10-22')).toEqual({ from: '2026-10-01', to: '2026-10-22' });
    expect(periodFromPreset('prev_month', '2026-03-15')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodFromPreset('7d', '2026-10-22')).toEqual({ from: '2026-10-16', to: '2026-10-22' });
    expect(previousPeriod({ from: '2026-10-16', to: '2026-10-22' })).toEqual({ from: '2026-10-09', to: '2026-10-15' });
  });
});
