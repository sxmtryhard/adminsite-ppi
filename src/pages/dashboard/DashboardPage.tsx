import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck2,
  CalendarX,
  Coins,
  Percent,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card, PageHeader, Segmented, StatCard } from '@/components/common/Layout';
import { Alert, Spinner } from '@/components/common/Feedback';
import { StatusBadge } from '@/components/common/StatusBadge';
import { BarList } from '@/components/charts/Charts';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAsync } from '@/hooks/useAsync';
import { productsService } from '@/services/firebase/products.service';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { changePct, PERIOD_LABELS, periodFromPreset, type PeriodPreset } from '@/domain/finance';
import { businessDate } from '@/domain/time';
import { formatCOP, formatPct } from '@/lib/format';

export const DashboardPage: React.FC = () => {
  const today = businessDate();
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const period = periodFromPreset(preset, today);
  const finance = useFinanceData(period);
  const ops = useAsync(() => Promise.all([appointmentsService.listByRange(today, today), productsService.getProducts()]), [today]);
  const [todayAppts, products] = ops.data ?? [[], []];
  const lowStock = products.filter((p) => p.active && p.stock <= p.minStock);

  const d = finance.data;
  const c = d?.current;
  const p = d?.previous;
  const incomplete = c && !c.costsComplete ? `Costos incompletos: ${c.itemsMissingCost} línea(s) sin costo configurado.` : undefined;

  return (
    <>
      <PageHeader
        title="Panel del negocio"
        description={`Rentabilidad y operación · ${period.from === period.to ? period.from : `${period.from} a ${period.to}`}`}
        actions={
          <Segmented
            label="Periodo"
            value={preset}
            onChange={setPreset}
            options={(['today', '7d', 'month', 'prev_month'] as PeriodPreset[]).map((v) => ({ value: v, label: PERIOD_LABELS[v] }))}
          />
        }
      />
      {finance.error && <Alert>{finance.error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingresos reconocidos" icon={TrendingUp} loading={finance.loading} value={formatCOP(c?.revenue ?? 0)} change={c && p ? changePct(c.revenue, p.revenue) : undefined} hint="vs. periodo anterior" />
        <StatCard
          label="Utilidad bruta"
          icon={Coins}
          loading={finance.loading}
          value={formatCOP(c?.grossProfit ?? 0)}
          change={c && p ? changePct(c.grossProfit, p.grossProfit) : undefined}
          hint={`Margen ${formatPct(c?.grossMarginPct ?? null)}`}
          warning={incomplete}
        />
        <StatCard
          label="Utilidad neta estimada"
          icon={PiggyBank}
          loading={finance.loading}
          value={formatCOP(c?.netProfit ?? 0)}
          change={c && p ? changePct(c.netProfit, p.netProfit) : undefined}
          hint={`Margen ${formatPct(c?.netMarginPct ?? null)}`}
          warning={incomplete}
        />
        <StatCard label="Ticket promedio" icon={Wallet} loading={finance.loading} value={c?.averageTicket == null ? '—' : formatCOP(c.averageTicket)} hint={`${c?.paidSalesCount ?? 0} ventas pagadas`} />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Costos directos" icon={Receipt} loading={finance.loading} value={formatCOP(c?.directCosts ?? 0)} positiveIsGood={false} change={c && p ? changePct(c.directCosts, p.directCosts) : undefined} />
        <StatCard label="Gastos operativos" icon={Percent} loading={finance.loading} value={formatCOP(c?.operatingExpenses ?? 0)} positiveIsGood={false} change={c && p ? changePct(c.operatingExpenses, p.operatingExpenses) : undefined} />
        <StatCard
          label="Citas completadas"
          icon={CalendarCheck2}
          loading={finance.loading}
          value={String(d?.statusCounts.completed ?? 0)}
          change={d ? changePct(d.statusCounts.completed, d.previousStatusCounts.completed) : undefined}
          hint={`${(d?.statusCounts.pending ?? 0) + (d?.statusCounts.confirmed ?? 0)} pendientes`}
        />
        <StatCard
          label="Cancelaciones"
          icon={CalendarX}
          loading={finance.loading}
          value={String((d?.statusCounts.cancelled ?? 0) + (d?.statusCounts.no_show ?? 0))}
          positiveIsGood={false}
          hint={`${d?.statusCounts.no_show ?? 0} inasistencias`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Agenda de hoy"
          icon={CalendarCheck2}
          actions={
            <Link to="/citas" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
              Ver agenda <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {ops.loading ? (
            <Spinner />
          ) : todayAppts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No hay citas para hoy.</p>
          ) : (
            <ul className="divide-y divide-line">
              {todayAppts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-semibold tabular-nums text-ink">{a.time}</span>
                    <div>
                      <p className="text-ink">{a.clientName}</p>
                      <p className="text-xs text-subtle">
                        {a.serviceName} · {a.barberName}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Servicios más vendidos" icon={TrendingUp}>
            {finance.loading ? (
              <Spinner />
            ) : (
              <BarList
                emptyText="Sin ventas en el periodo."
                items={(d?.topServices ?? []).slice(0, 5).map((s) => ({ key: s.refId, label: s.name, value: s.quantity, display: `${s.quantity}`, sub: formatCOP(s.revenue) }))}
              />
            )}
          </Card>
          <Card
            title="Existencias bajas"
            icon={AlertTriangle}
            actions={
              <Link to="/productos" className="text-xs text-muted hover:text-ink">
                Inventario
              </Link>
            }
          >
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted">Todo el inventario está sobre el mínimo.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lowStock.map((prod) => (
                  <li key={prod.id} className="flex justify-between">
                    <span className="text-ink">{prod.name}</span>
                    <span className="font-medium text-warning">
                      {prod.stock} / mín. {prod.minStock}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <p className="text-xs text-subtle">
        Ingreso reconocido = ventas pagadas no anuladas. Utilidad bruta = ingresos − costos directos (servicios + costo de productos vendidos). Utilidad
        neta estimada = utilidad bruta − gastos operativos. Detalle completo en{' '}
        <Link to="/reportes" className="text-accent hover:underline">
          Reportes
        </Link>
        .
      </p>
    </>
  );
};
