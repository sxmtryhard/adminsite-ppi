import React, { useState } from 'react';
import { BarChart3, Download, LineChart, Package, Printer, Scissors, Users } from 'lucide-react';
import { Card, PageHeader, Segmented } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert, Spinner } from '@/components/common/Feedback';
import { Badge } from '@/components/common/StatusBadge';
import { BarList, TrendChart } from '@/components/charts/Charts';
import { useFinanceData } from '@/hooks/useFinanceData';
import { changePct, inPeriod, marginPct, saleDate, PERIOD_LABELS, periodFromPreset, type FinanceSummary, type PeriodPreset, type RankedItem } from '@/domain/finance';
import { businessDate } from '@/domain/time';
import { formatCOP, formatPct } from '@/lib/format';
import { exportToCSV } from '@/utils/exportCsv';

type Preset = PeriodPreset | 'custom';

const Row: React.FC<{ label: string; value: number; prev?: number; strong?: boolean; negative?: boolean; note?: string }> = ({
  label,
  value,
  prev,
  strong,
  negative,
  note,
}) => {
  const delta = prev === undefined ? null : changePct(value, prev);
  return (
    <tr className={strong ? 'font-semibold' : undefined}>
      <td>
        {label}
        {note && <span className="block text-xs font-normal text-subtle">{note}</span>}
      </td>
      <td className="text-right tabular-nums">{negative && value ? `−${formatCOP(value)}` : formatCOP(value)}</td>
      <td className="text-right tabular-nums text-muted">{prev === undefined ? '' : formatCOP(prev)}</td>
      <td className="text-right text-xs text-muted">{delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} %`}</td>
    </tr>
  );
};

const Statement: React.FC<{ c: FinanceSummary; p: FinanceSummary }> = ({ c, p }) => (
  <div className="overflow-x-auto">
    <table className="table-base min-w-[560px]">
      <thead>
        <tr>
          <th>Concepto</th>
          <th className="text-right">Periodo</th>
          <th className="text-right">Anterior</th>
          <th className="text-right">Var.</th>
        </tr>
      </thead>
      <tbody>
        <Row label="Ingresos por servicios" value={c.serviceRevenue} prev={p.serviceRevenue} note="Netos de descuento prorrateado" />
        <Row label="Ingresos por productos" value={c.productRevenue} prev={p.productRevenue} />
        <Row label="Ingresos reconocidos" value={c.revenue} prev={p.revenue} strong note={`Descuentos otorgados: ${formatCOP(c.discounts)}`} />
        <Row label="Costo directo de servicios" value={c.serviceCosts} prev={p.serviceCosts} negative />
        <Row label="Costo de productos vendidos" value={c.cogs} prev={p.cogs} negative />
        <Row label="Utilidad bruta" value={c.grossProfit} prev={p.grossProfit} strong note={`Margen bruto ${formatPct(c.grossMarginPct)}`} />
        <Row label="Gastos operativos" value={c.operatingExpenses} prev={p.operatingExpenses} negative />
        <Row label="Utilidad neta estimada" value={c.netProfit} prev={p.netProfit} strong note={`Margen neto ${formatPct(c.netMarginPct)}`} />
        <Row label="Ventas anuladas (no incluidas)" value={c.voidedAmount} prev={p.voidedAmount} note={`${c.voidedSalesCount} anulaciones`} />
      </tbody>
    </table>
  </div>
);

const ProfitTable: React.FC<{ items: RankedItem[]; empty: string }> = ({ items, empty }) =>
  items.length === 0 ? (
    <p className="py-6 text-center text-sm text-muted">{empty}</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="table-base min-w-[520px]">
        <thead>
          <tr>
            <th>Ítem</th>
            <th className="text-right">Cant.</th>
            <th className="text-right">Ingreso</th>
            <th className="text-right">Costo</th>
            <th className="text-right">Margen</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.refId}>
              <td>{i.name}</td>
              <td className="text-right tabular-nums">{i.quantity}</td>
              <td className="text-right tabular-nums">{formatCOP(i.revenue)}</td>
              <td className="text-right tabular-nums">{i.cost === null ? <Badge tone="warning">Incompleto</Badge> : formatCOP(i.cost)}</td>
              <td className="text-right tabular-nums">{i.profit === null ? '—' : formatPct(marginPct(i.profit, i.revenue))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

export const ReportsPage: React.FC = () => {
  const today = businessDate();
  const [preset, setPreset] = useState<Preset>('month');
  const [custom, setCustom] = useState({ from: `${today.slice(0, 7)}-01`, to: today });
  const period = preset === 'custom' ? custom : periodFromPreset(preset, today);
  const { data, loading, error } = useFinanceData(period);
  const [notice, setNotice] = useState<string | null>(null);

  const exportStatement = () => {
    if (!data) return;
    const c = data.current;
    const rows = [
      ['Ingresos por servicios', c.serviceRevenue],
      ['Ingresos por productos', c.productRevenue],
      ['Ingresos reconocidos', c.revenue],
      ['Descuentos', c.discounts],
      ['Costo directo de servicios', c.serviceCosts],
      ['Costo de productos vendidos', c.cogs],
      ['Utilidad bruta', c.grossProfit],
      ['Margen bruto %', c.grossMarginPct === null ? 'N/A' : c.grossMarginPct.toFixed(2)],
      ['Gastos operativos', c.operatingExpenses],
      ['Utilidad neta estimada', c.netProfit],
      ['Margen neto %', c.netMarginPct === null ? 'N/A' : c.netMarginPct.toFixed(2)],
      ['Ventas pagadas', c.paidSalesCount],
      ['Ventas anuladas', c.voidedSalesCount],
      ['Costos completos', c.costsComplete ? 'Sí' : `No (${c.itemsMissingCost} líneas sin costo)`],
    ].map(([concepto, valor]) => ({ concepto, valor }));
    const ok = exportToCSV(`estado_resultados_${period.from}_${period.to}`, rows, [
      { key: 'concepto', label: 'Concepto' },
      { key: 'valor', label: 'Valor (COP)' },
    ]);
    setNotice(ok ? null : 'No hay datos para exportar.');
  };

  return (
    <>
      <PageHeader
        title="Reportes financieros y operativos"
        description={`Periodo ${period.from} a ${period.to}, comparado con el periodo anterior de igual duración.`}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden /> PDF
            </Button>
            <Button variant="outline" onClick={exportStatement} disabled={!data}>
              <Download className="h-4 w-4" aria-hidden /> Excel (CSV)
            </Button>
          </>
        }
      />
      <div className="no-print flex flex-wrap items-end gap-3">
        <Segmented
          label="Periodo"
          value={preset}
          onChange={setPreset}
          options={[...(['7d', '30d', 'month', 'prev_month'] as PeriodPreset[]).map((v) => ({ value: v as Preset, label: PERIOD_LABELS[v] })), { value: 'custom', label: 'Personalizado' }]}
        />
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 sm:w-80">
            <Input label="Desde" type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <Input label="Hasta" type="date" min={custom.from} max={today} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </div>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}
      {data && !data.current.costsComplete && (
        <Alert tone="warning">
          Indicadores incompletos: {data.current.itemsMissingCost} línea(s) vendida(s) no tienen costo configurado (se cuentan como 0). Configura el costo
          en Servicios o registra entradas de inventario con su costo.
        </Alert>
      )}

      {loading || !data ? (
        <div className="card">
          <Spinner />
        </div>
      ) : (
        <>
          <Card title="Estado de resultados" icon={BarChart3} bodyClassName="p-0">
            <Statement c={data.current} p={data.previous} />
          </Card>

          <Card title="Evolución diaria: ingresos frente a costos" icon={LineChart}>
            <TrendChart
              dates={data.series.map((s) => s.date)}
              series={[
                { label: 'Ingresos', color: 'rgb(99 102 241)', values: data.series.map((s) => s.revenue) },
                { label: 'Costos directos', color: 'rgb(251 191 36)', values: data.series.map((s) => s.directCosts) },
                { label: 'Gastos operativos', color: 'rgb(248 113 113)', values: data.series.map((s) => s.expenses) },
              ]}
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Rentabilidad por servicio" icon={Scissors} bodyClassName="p-0">
              <ProfitTable items={data.topServices} empty="Sin servicios vendidos." />
            </Card>
            <Card title="Rentabilidad por producto" icon={Package} bodyClassName="p-0">
              <ProfitTable items={data.topProducts} empty="Sin productos vendidos." />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Desempeño por barbero" icon={Users}>
              <BarList
                emptyText="Sin servicios atribuidos a barberos."
                items={data.barbers.map((b) => ({
                  key: b.barberId,
                  label: b.barberName,
                  value: b.serviceRevenue,
                  display: formatCOP(b.serviceRevenue),
                  sub: `${b.servicesCount} servicios cobrados · ${b.completedAppointments} citas completadas · productos ${formatCOP(b.productRevenue)}`,
                }))}
              />
            </Card>
            <Card title="Clientes recurrentes" icon={Users}>
              <BarList
                emptyText="Sin clientes identificados en las ventas."
                items={Object.values(
                  data.sales
                    .filter((s) => s.status === 'paid' && s.clientId && inPeriod(saleDate(s), period))
                    .reduce<Record<string, { key: string; label: string; value: number; total: number }>>((acc, s) => {
                      const k = s.clientId as string;
                      acc[k] = acc[k] ?? { key: k, label: s.clientName || 'Cliente', value: 0, total: 0 };
                      acc[k].value += 1;
                      acc[k].total += s.total;
                      return acc;
                    }, {})
                )
                  .filter((c) => c.value > 1)
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 8)
                  .map((c) => ({ key: c.key, label: c.label, value: c.value, display: `${c.value} visitas`, sub: formatCOP(c.total) }))}
              />
            </Card>
          </div>
        </>
      )}
    </>
  );
};
