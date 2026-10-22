import React, { useMemo, useState } from 'react';
import { Download, History, Printer, Search } from 'lucide-react';
import { PageHeader, Segmented } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Alert, EmptyState, SkeletonRows } from '@/components/common/Feedback';
import { Badge, StatusBadge } from '@/components/common/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { salesService } from '@/services/firebase/sales.service';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { barbersService } from '@/services/firebase/barbers.service';
import { STATUS_LABELS } from '@/domain/appointmentStatus';
import { businessDate, addDays } from '@/domain/time';
import { formatCOP, formatDateTime } from '@/lib/format';
import { exportToCSV } from '@/utils/exportCsv';
import { PAYMENT_LABELS, type PaymentMethod, type Sale } from '@/types/sale.types';
import type { AppointmentStatus } from '@/types/appointment.types';

export const HistoryPage: React.FC = () => {
  const { actor } = useSession();
  const today = businessDate();
  const [tab, setTab] = useState<'sales' | 'appointments'>('sales');
  const [range, setRange] = useState({ from: addDays(today, -29), to: today });
  const [barberId, setBarberId] = useState('all');
  const [method, setMethod] = useState<'all' | PaymentMethod>('all');
  const [saleStatus, setSaleStatus] = useState<'all' | Sale['status']>('all');
  const [apptStatus, setApptStatus] = useState<'all' | AppointmentStatus>('all');
  const [search, setSearch] = useState('');
  const [voiding, setVoiding] = useState<Sale | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const data = useAsync(
    () =>
      Promise.all([
        salesService.listByRange(range.from, range.to),
        appointmentsService.listByRange(range.from, range.to),
        barbersService.getBarbers(),
      ]),
    [range.from, range.to]
  );
  const [sales, appointments, barbers] = data.data ?? [[], [], []];
  const q = search.trim().toLowerCase();

  const filteredSales = useMemo(
    () =>
      sales.filter(
        (s) =>
          (barberId === 'all' || s.barberId === barberId) &&
          (method === 'all' || s.paymentMethod === method) &&
          (saleStatus === 'all' || s.status === saleStatus) &&
          (!q || s.clientName.toLowerCase().includes(q) || s.items.some((i) => i.name.toLowerCase().includes(q)))
      ),
    [sales, barberId, method, saleStatus, q]
  );

  const filteredAppts = useMemo(
    () =>
      [...appointments]
        .reverse()
        .filter(
          (a) =>
            (barberId === 'all' || a.barberId === barberId) &&
            (apptStatus === 'all' || a.status === apptStatus) &&
            (!q || a.clientName.toLowerCase().includes(q) || a.serviceName.toLowerCase().includes(q))
        ),
    [appointments, barberId, apptStatus, q]
  );

  const paidTotal = filteredSales.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.total, 0);

  const exportCurrent = () => {
    const ok =
      tab === 'sales'
        ? exportToCSV(
            'ventas',
            filteredSales.map((s) => ({
              fecha: formatDateTime(s.createdAt),
              items: s.items.map((i) => `${i.quantity}x ${i.name}`).join(' | '),
              cliente: s.clientName,
              barbero: s.barberName,
              metodo: PAYMENT_LABELS[s.paymentMethod],
              subtotal: s.subtotal,
              descuento: s.discount,
              total: s.total,
              estado: s.status === 'paid' ? 'Pagada' : 'Anulada',
            })),
            [
              { key: 'fecha', label: 'Fecha' },
              { key: 'items', label: 'Ítems' },
              { key: 'cliente', label: 'Cliente' },
              { key: 'barbero', label: 'Barbero' },
              { key: 'metodo', label: 'Método de pago' },
              { key: 'subtotal', label: 'Subtotal' },
              { key: 'descuento', label: 'Descuento' },
              { key: 'total', label: 'Total' },
              { key: 'estado', label: 'Estado' },
            ]
          )
        : exportToCSV(
            'citas',
            filteredAppts.map((a) => ({
              fecha: a.date,
              hora: a.time,
              cliente: a.clientName,
              servicio: a.serviceName,
              barbero: a.barberName,
              precio: a.servicePrice,
              estado: STATUS_LABELS[a.status],
            })),
            [
              { key: 'fecha', label: 'Fecha' },
              { key: 'hora', label: 'Hora' },
              { key: 'cliente', label: 'Cliente' },
              { key: 'servicio', label: 'Servicio' },
              { key: 'barbero', label: 'Barbero' },
              { key: 'precio', label: 'Precio' },
              { key: 'estado', label: 'Estado' },
            ]
          );
    setNotice(ok ? null : 'No hay datos para exportar con los filtros actuales.');
  };

  return (
    <>
      <PageHeader
        title="Historial"
        description="Ventas, pagos y citas de todo el negocio, con filtros y exportación."
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden /> PDF
            </Button>
            <Button variant="outline" onClick={exportCurrent}>
              <Download className="h-4 w-4" aria-hidden /> Excel (CSV)
            </Button>
          </>
        }
      />

      <div className="card space-y-3 p-4 no-print">
        <Segmented
          label="Tipo de historial"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sales', label: 'Ventas y pagos' },
            { value: 'appointments', label: 'Citas' },
          ]}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <Input label="Desde" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <Input label="Hasta" type="date" min={range.from} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          <Select label="Barbero" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            <option value="all">Todos</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.fullName}
              </option>
            ))}
          </Select>
          {tab === 'sales' ? (
            <>
              <Select label="Método" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                <option value="all">Todos</option>
                {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
              <Select label="Estado" value={saleStatus} onChange={(e) => setSaleStatus(e.target.value as typeof saleStatus)}>
                <option value="all">Todas</option>
                <option value="paid">Pagadas</option>
                <option value="voided">Anuladas</option>
              </Select>
            </>
          ) : (
            <Select label="Estado" value={apptStatus} onChange={(e) => setApptStatus(e.target.value as typeof apptStatus)}>
              <option value="all">Todos</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
          <Input label="Buscar" placeholder="Cliente, servicio o producto" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {data.error && <Alert>{data.error}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}

      <div className="card overflow-hidden">
        {data.loading ? (
          <SkeletonRows />
        ) : tab === 'sales' ? (
          filteredSales.length === 0 ? (
            <EmptyState icon={History} title="Sin ventas para estos filtros" />
          ) : (
            <>
              <div className="flex justify-between border-b border-line px-5 py-3 text-sm">
                <span className="text-muted">{filteredSales.length} ventas</span>
                <span className="text-muted">
                  Cobrado: <strong className="text-ink">{formatCOP(paidTotal)}</strong>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base min-w-[860px]">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Detalle</th>
                      <th>Cliente / Barbero</th>
                      <th>Método</th>
                      <th className="text-right">Total</th>
                      <th>Estado</th>
                      <th className="no-print" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap text-xs">{formatDateTime(s.createdAt)}</td>
                        <td className="text-xs">
                          {s.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                          {s.appointmentId && <span className="block text-subtle">Cobro de cita</span>}
                        </td>
                        <td className="text-xs">
                          {s.clientName || 'Ocasional'}
                          <span className="block text-subtle">{s.barberName || '—'}</span>
                        </td>
                        <td className="text-xs">{PAYMENT_LABELS[s.paymentMethod]}</td>
                        <td className="text-right font-medium tabular-nums">
                          {formatCOP(s.total)}
                          {s.discount > 0 && <span className="block text-xs font-normal text-subtle">desc. {formatCOP(s.discount)}</span>}
                        </td>
                        <td>
                          {s.status === 'paid' ? <Badge tone="success">Pagada</Badge> : <Badge tone="danger">Anulada</Badge>}
                          {s.voidReason && <span className="block text-xs text-subtle">{s.voidReason}</span>}
                        </td>
                        <td className="no-print text-right">
                          {s.status === 'paid' && (
                            <Button size="sm" variant="ghost" className="text-danger" onClick={() => setVoiding(s)}>
                              Anular
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : filteredAppts.length === 0 ? (
          <EmptyState icon={History} title="Sin citas para estos filtros" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Barbero</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppts.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">
                      {a.date} <span className="text-subtle">{a.time}</span>
                    </td>
                    <td>{a.clientName}</td>
                    <td>
                      {a.serviceName}
                      <span className="block text-xs text-subtle">{formatCOP(a.servicePrice)}</span>
                    </td>
                    <td>{a.barberName}</td>
                    <td>
                      <StatusBadge status={a.status} />
                      {a.cancelReason && <span className="block text-xs text-subtle">{a.cancelReason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={voiding !== null}
        title="Anular venta"
        message={`La venta de ${voiding ? formatCOP(voiding.total) : ''} dejará de contar como ingreso, se devolverán las existencias de productos y, si era el cobro de una cita, la cita quedará pendiente de cobro.`}
        confirmLabel="Anular venta"
        reasonLabel="Motivo (devolución, error de digitación…)"
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return;
          await salesService.voidSale(voiding.id, reason, actor);
          setVoiding(null);
          data.reload();
        }}
      />
    </>
  );
};
