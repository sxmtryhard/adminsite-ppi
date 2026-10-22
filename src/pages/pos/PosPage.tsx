import React, { useMemo, useState } from 'react';
import { ArrowRight, Banknote, CreditCard, Landmark, Minus, Plus, Receipt, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { PageHeader, Segmented } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { productsService } from '@/services/firebase/products.service';
import { servicesService } from '@/services/firebase/services.service';
import { barbersService } from '@/services/firebase/barbers.service';
import { clientsService } from '@/services/firebase/clients.service';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { MAX_SALE_LINES, salesService } from '@/services/firebase/sales.service';
import { toUserMessage } from '@/services/firebase/helpers';
import { addDays, businessDate } from '@/domain/time';
import { formatCOP } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment.types';
import type { PaymentMethod, SaleItem } from '@/types/sale.types';

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'transfer', label: 'Transferencia', icon: Landmark },
  { value: 'card', label: 'Datáfono', icon: CreditCard },
];

export const PosPage: React.FC = () => {
  const { actor } = useSession();
  const today = businessDate();
  const catalog = useAsync(
    () =>
      Promise.all([
        servicesService.getServices(),
        productsService.getProducts(),
        barbersService.getBarbers(),
        clientsService.getClients(),
        appointmentsService.listByRange(addDays(today, -14), today),
      ]),
    [today]
  );
  const [services, products, barbers, clients, recent] = catalog.data ?? [[], [], [], [], []];
  const pendingCharges = recent.filter((a) => a.status === 'completed' && !a.saleId);

  const [tab, setTab] = useState<'service' | 'product'>('service');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [barberId, setBarberId] = useState('');
  const [clientId, setClientId] = useState('');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  // Id de la venta en curso: se mantiene entre reintentos para que un doble clic no duplique el cobro.
  const [saleId, setSaleId] = useState(() => salesService.newSaleId());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const stockOf = (id: string) => products.find((p) => p.id === id)?.stock ?? 0;

  const addItem = (refId: string, type: SaleItem['type'], name: string, unitPrice: number) => {
    setSuccess(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.refId === refId && i.type === type);
      if (existing) {
        if (type === 'product' && existing.quantity >= stockOf(refId)) return prev;
        return prev.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice } : i));
      }
      if (prev.length >= MAX_SALE_LINES) return prev;
      return [...prev, { refId, type, name, unitPrice, quantity: 1, subtotal: unitPrice }];
    });
  };

  const changeQty = (item: SaleItem, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i !== item) return i;
          const max = i.type === 'product' ? stockOf(i.refId) : 20;
          const quantity = Math.min(Math.max(i.quantity + delta, 0), max);
          return { ...i, quantity, subtotal: quantity * i.unitPrice };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const discountValue = discount.trim() === '' ? 0 : Number(discount);
  const discountError =
    !Number.isInteger(discountValue) || discountValue < 0 || discountValue > subtotal ? 'Descuento inválido (entero, entre 0 y el subtotal).' : null;
  const total = subtotal - (discountError ? 0 : discountValue);

  const chargeAppointment = (a: Appointment) => {
    setAppointment(a);
    setCart([{ refId: a.serviceId, type: 'service', name: a.serviceName, unitPrice: a.servicePrice, quantity: 1, subtotal: a.servicePrice }]);
    setBarberId(a.barberId);
    setClientId(a.clientId);
    setSuccess(null);
    setError(null);
  };

  const resetSale = () => {
    setCart([]);
    setDiscount('');
    setAppointment(null);
    setClientId('');
    setSaleId(salesService.newSaleId());
  };

  const checkout = async () => {
    if (cart.length === 0 || discountError) return;
    const hasService = cart.some((i) => i.type === 'service');
    if (hasService && !barberId) {
      setError('Selecciona el barbero que realizó el servicio (se usa para su desempeño y comisiones).');
      return;
    }
    const barber = barbers.find((b) => b.id === barberId);
    const client = clients.find((c) => c.id === clientId);
    setSubmitting(true);
    setError(null);
    try {
      await salesService.createSale(
        saleId,
        {
          items: cart,
          discount: discountValue,
          paymentMethod: method,
          barberId: barber?.id ?? null,
          barberName: barber?.fullName ?? '',
          clientId: client?.id ?? appointment?.clientId ?? null,
          clientName: client?.fullName ?? appointment?.clientName ?? '',
          appointmentId: appointment?.id ?? null,
        },
        actor
      );
      setSuccess(`Venta registrada por ${formatCOP(total)}.`);
      resetSale();
      catalog.reload();
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible registrar la venta.'));
    } finally {
      setSubmitting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const list = useMemo(
    () =>
      tab === 'service'
        ? services.filter((s) => s.status === 'active' && s.name.toLowerCase().includes(q)).map((s) => ({ id: s.id, name: s.name, price: s.price, stock: null as number | null }))
        : products.filter((p) => p.active && p.name.toLowerCase().includes(q)).map((p) => ({ id: p.id, name: p.name, price: p.salePrice, stock: p.stock })),
    [tab, services, products, q]
  );

  return (
    <>
      <PageHeader title="Caja y punto de venta" description="Cobro de servicios y productos. Cada venta descuenta inventario de forma atómica." />
      {catalog.error && <Alert>{catalog.error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {pendingCharges.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink">Citas completadas por cobrar</h2>
              <ul className="space-y-2">
                {pendingCharges.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium text-ink">{a.clientName}</span> · {a.serviceName} · {a.barberName}
                      <span className="block text-xs text-subtle">
                        {a.date} {a.time}
                      </span>
                    </span>
                    <Button size="sm" variant={appointment?.id === a.id ? 'default' : 'subtle'} onClick={() => chargeAppointment(a)}>
                      Cobrar {formatCOP(a.servicePrice)}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Segmented
                label="Tipo de ítem"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'service', label: 'Servicios' },
                  { value: 'product', label: 'Productos' },
                ]}
              />
              <div className="sm:ml-auto sm:w-64">
                <Input aria-label="Buscar en el catálogo" placeholder="Buscar…" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            {catalog.loading ? (
              <Spinner />
            ) : list.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No hay ítems activos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {list.map((item) => {
                  const out = item.stock !== null && item.stock <= 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={out || appointment !== null}
                      onClick={() => addItem(item.id, tab, item.name, item.price)}
                      className="rounded-2xl border border-line bg-surface-2 p-3 text-left transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <p className="line-clamp-2 text-sm font-medium text-ink">{item.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">{formatCOP(item.price)}</span>
                        {item.stock !== null && <span className="text-xs text-subtle">Disp. {item.stock}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {appointment && <p className="mt-3 text-xs text-muted">Estás cobrando una cita: finaliza o limpia el ticket para agregar otros ítems.</p>}
          </section>
        </div>

        <aside className="card flex h-fit flex-col p-5 lg:sticky lg:top-0" aria-label="Ticket de venta">
          <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShoppingCart className="h-4 w-4 text-muted" aria-hidden /> Ticket
            </h2>
            {cart.length > 0 && (
              <button className="text-xs text-muted hover:text-danger" onClick={resetSale}>
                Limpiar
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <EmptyState icon={Receipt} title="Ticket vacío" description="Agrega servicios o productos, o cobra una cita completada." />
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {cart.map((item) => (
                <li key={`${item.type}-${item.refId}`} className="flex items-center gap-2 border-b border-line/60 pb-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-subtle">{formatCOP(item.unitPrice)} c/u</p>
                  </div>
                  {!appointment && (
                    <div className="flex items-center gap-1">
                      <button className="rounded-full bg-surface-2 p-1 text-muted hover:text-ink" onClick={() => changeQty(item, -1)} aria-label={`Quitar una unidad de ${item.name}`}>
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center tabular-nums">{item.quantity}</span>
                      <button className="rounded-full bg-surface-2 p-1 text-muted hover:text-ink" onClick={() => changeQty(item, 1)} aria-label={`Agregar una unidad de ${item.name}`}>
                        <Plus className="h-3 w-3" />
                      </button>
                      <button className="p-1 text-subtle hover:text-danger" onClick={() => changeQty(item, -item.quantity)} aria-label={`Eliminar ${item.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <Select label="Barbero que atendió" value={barberId} onChange={(e) => setBarberId(e.target.value)} disabled={appointment !== null}>
              <option value="">— Sin barbero (solo productos) —</option>
              {barbers.filter((b) => b.status === 'active' || b.id === barberId).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.fullName}
                </option>
              ))}
            </Select>
            <Select label="Cliente (opcional)" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={appointment !== null}>
              <option value="">— Cliente ocasional —</option>
              {clients.filter((c) => c.status === 'active' || c.id === clientId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </Select>
            <Input label="Descuento (COP)" type="number" min={0} step={500} value={discount} onChange={(e) => setDiscount(e.target.value)} error={cart.length ? discountError ?? undefined : undefined} />
            <div>
              <p className="field-label">Método de pago</p>
              <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-3 gap-2">
                {METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={method === value}
                    onClick={() => setMethod(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border py-2 text-xs transition',
                      method === value ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:text-ink'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-subtle">Se registra el medio usado; no se procesan pagos con tarjeta en la app.</p>
            </div>
          </div>

          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCOP(subtotal)}</span>
            </div>
            {discountValue > 0 && !discountError && (
              <div className="flex justify-between text-muted">
                <span>Descuento</span>
                <span className="tabular-nums">−{formatCOP(discountValue)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-semibold text-ink">
              <span>Total</span>
              <span className="tabular-nums">{formatCOP(total)}</span>
            </div>
          </div>
          {error && <Alert className="mt-3">{error}</Alert>}
          <Button className="mt-4 w-full" size="lg" onClick={checkout} isLoading={submitting} disabled={cart.length === 0 || Boolean(discountError)}>
            Registrar cobro <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </aside>
      </div>
    </>
  );
};
