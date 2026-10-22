import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownUp, History, Package, PackagePlus, Pencil, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Select, Textarea } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Alert, EmptyState, SkeletonRows, Spinner } from '@/components/common/Feedback';
import { ActiveBadge, Badge } from '@/components/common/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { useSettings } from '@/hooks/useSettings';
import { productsService } from '@/services/firebase/products.service';
import { toUserMessage } from '@/services/firebase/helpers';
import { marginPct } from '@/domain/finance';
import { hasErrors, validateMoney, validateName, validateQuantity, type FieldErrors } from '@/domain/validation';
import { formatCOP, formatDateTime, formatPct } from '@/lib/format';
import { MOVEMENT_LABELS, PRODUCT_CATEGORY_LABELS, type Product, type ProductCategory } from '@/types/product.types';

type Panel =
  | { kind: 'new' }
  | { kind: 'edit'; product: Product }
  | { kind: 'purchase' | 'adjust'; product: Product }
  | { kind: 'movements'; product: Product | null }
  | null;

const Movements: React.FC<{ product: Product | null }> = ({ product }) => {
  const list = useAsync(() => productsService.getMovements(product?.id), [product?.id]);
  if (list.loading) return <Spinner />;
  if (list.error) return <Alert>{list.error}</Alert>;
  if (!list.data?.length) return <p className="py-6 text-center text-sm text-muted">Sin movimientos registrados.</p>;
  return (
    <div className="max-h-[60vh] overflow-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Fecha</th>
            {!product && <th>Producto</th>}
            <th>Tipo</th>
            <th className="text-right">Cant.</th>
            <th className="text-right">Saldo</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {list.data.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap text-xs">{formatDateTime(m.createdAt)}</td>
              {!product && <td>{m.productName}</td>}
              <td className="text-xs">{MOVEMENT_LABELS[m.type]}</td>
              <td className={`text-right font-medium tabular-nums ${m.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
              </td>
              <td className="text-right tabular-nums">{m.stockAfter}</td>
              <td className="text-xs text-muted">
                {m.reason}
                {m.unitCost !== null && m.type === 'purchase' && ` · ${formatCOP(m.unitCost)} c/u`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const ProductsPage: React.FC = () => {
  const { actor } = useSession();
  const { settings } = useSettings();
  const data = useAsync(() => Promise.all([productsService.getProducts(), productsService.getCosts()]), []);
  const [products, costs] = data.data ?? [[], new Map<string, number | null>()];
  const [panel, setPanel] = useState<Panel>(null);
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [operationId, setOperationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lowStock = products.filter((p) => p.active && p.stock <= p.minStock);
  const filtered = useMemo(
    () =>
      products.filter(
        (p) => p.name.toLowerCase().includes(search.trim().toLowerCase()) && (!onlyLow || (p.active && p.stock <= p.minStock))
      ),
    [products, search, onlyLow]
  );

  const open = (next: Panel) => {
    setPanel(next);
    setErrors({});
    setError(null);
    setOperationId(crypto.randomUUID());
    if (next?.kind === 'new') {
      setForm({ name: '', description: '', category: 'cuidado_capilar', salePrice: '', minStock: String(settings.defaultMinStock), initialStock: '0', unitCost: '' });
    } else if (next?.kind === 'edit') {
      const p = next.product;
      setForm({ name: p.name, description: p.description, category: p.category, salePrice: String(p.salePrice), minStock: String(p.minStock) });
    } else if (next?.kind === 'purchase' || next?.kind === 'adjust') {
      setForm({ quantity: '', unitCost: '', reason: '' });
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      setPanel(null);
      data.reload();
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible guardar.'));
    } finally {
      setSaving(false);
    }
  };

  const submitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const salePrice = Number(form.salePrice);
    const minStock = Number(form.minStock);
    const next: FieldErrors = {
      name: validateName(form.name),
      salePrice: validateMoney(salePrice, { allowZero: false }),
      minStock: Number.isInteger(minStock) && minStock >= 0 ? undefined : 'Valor inválido.',
    };
    if (panel?.kind === 'new') {
      const initial = Number(form.initialStock);
      next.initialStock = Number.isInteger(initial) && initial >= 0 ? undefined : 'Valor inválido.';
      if (initial > 0) next.unitCost = validateMoney(Number(form.unitCost));
    }
    setErrors(next);
    if (hasErrors(next) || !panel) return;
    const base = { name: form.name, description: form.description, category: form.category as ProductCategory, salePrice, minStock };
    if (panel.kind === 'new') {
      const initialStock = Number(form.initialStock);
      void run(() =>
        productsService
          .createProduct({ ...base, initialStock, unitCost: initialStock > 0 ? Number(form.unitCost) : null }, actor)
          .then(() => undefined)
      );
    } else if (panel.kind === 'edit') {
      void run(() => productsService.updateProduct(panel.product, base, actor));
    }
  };

  const submitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (panel?.kind !== 'purchase' && panel?.kind !== 'adjust') return;
    const quantity = Number(form.quantity);
    const next: FieldErrors = {};
    if (panel.kind === 'purchase') {
      next.quantity = validateQuantity(quantity);
      next.unitCost = validateMoney(Number(form.unitCost));
    } else {
      next.quantity = Number.isInteger(quantity) && quantity !== 0 ? undefined : 'Usa un entero distinto de cero (negativo para salidas).';
      next.reason = form.reason.trim().length >= 3 ? undefined : 'Indica el motivo del ajuste.';
    }
    setErrors(next);
    if (hasErrors(next)) return;
    void run(() =>
      productsService.recordMovement(
        {
          productId: panel.product.id,
          type: panel.kind === 'purchase' ? 'purchase' : 'adjustment',
          quantity,
          unitCost: panel.kind === 'purchase' ? Number(form.unitCost) : null,
          reason: panel.kind === 'purchase' ? form.reason || 'Compra a proveedor' : form.reason,
          operationId,
        },
        actor
      )
    );
  };

  const field = (key: string) => ({
    value: form[key] ?? '',
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <>
      <PageHeader
        title="Inventario y productos"
        description="Existencias, costo promedio, entradas, ajustes e historial de movimientos."
        actions={
          <>
            <Button variant="outline" onClick={() => open({ kind: 'movements', product: null })}>
              <History className="h-4 w-4" aria-hidden /> Movimientos
            </Button>
            <Button onClick={() => open({ kind: 'new' })}>
              <Plus className="h-4 w-4" aria-hidden /> Nuevo producto
            </Button>
          </>
        }
      />

      {lowStock.length > 0 && (
        <Alert tone="warning">
          {lowStock.length} producto(s) con existencias bajas: {lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}.
        </Alert>
      )}
      {(data.error || (error && !panel)) && <Alert>{data.error ?? error}</Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <Input aria-label="Buscar producto" placeholder="Buscar producto…" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Solo existencias bajas
        </label>
      </div>

      <div className="card overflow-hidden">
        {data.loading ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="Sin productos" description="Registra productos con su costo para calcular el costo de lo vendido." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[900px]">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Costo prom.</th>
                  <th>Precio</th>
                  <th>Margen</th>
                  <th className="text-center">Existencias</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const cost = costs.get(p.id) ?? null;
                  const low = p.active && p.stock <= p.minStock;
                  return (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-subtle">{PRODUCT_CATEGORY_LABELS[p.category] ?? p.category}</p>
                      </td>
                      <td>{cost === null ? <Badge tone="warning">Sin costo</Badge> : formatCOP(cost)}</td>
                      <td className="font-medium">{formatCOP(p.salePrice)}</td>
                      <td>{cost === null ? '—' : formatPct(marginPct(p.salePrice - cost, p.salePrice))}</td>
                      <td className="text-center">
                        <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${low ? 'text-warning' : ''}`}>
                          {low && <AlertTriangle className="h-3.5 w-3.5" aria-label="Existencias bajas" />}
                          {p.stock}
                        </span>
                        <span className="block text-xs text-subtle">mín. {p.minStock}</span>
                      </td>
                      <td>
                        <ActiveBadge active={p.active} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="subtle" onClick={() => open({ kind: 'purchase', product: p })}>
                            <PackagePlus className="h-3.5 w-3.5" aria-hidden /> Entrada
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => open({ kind: 'adjust', product: p })} aria-label={`Ajustar ${p.name}`}>
                            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => open({ kind: 'movements', product: p })} aria-label={`Movimientos de ${p.name}`}>
                            <History className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => open({ kind: 'edit', product: p })} aria-label={`Editar ${p.name}`}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => run(() => productsService.setActive(p, !p.active, actor))}
                          >
                            {p.active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={panel?.kind === 'new' || panel?.kind === 'edit'} onClose={() => setPanel(null)} title={panel?.kind === 'new' ? 'Nuevo producto' : 'Editar producto'}>
        <form onSubmit={submitProduct} className="space-y-4" noValidate>
          <Input label="Nombre *" {...field('name')} />
          <Textarea label="Descripción (visible en el catálogo)" maxLength={300} {...field('description')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Categoría" {...field('category')}>
              {Object.entries(PRODUCT_CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Input label="Precio de venta (COP) *" type="number" min={0} step={500} {...field('salePrice')} />
            <Input label="Alerta de existencias bajas" type="number" min={0} {...field('minStock')} />
            {panel?.kind === 'new' && (
              <>
                <Input label="Existencias iniciales" type="number" min={0} {...field('initialStock')} />
                <Input label="Costo unitario de compra (COP)" type="number" min={0} step={100} hint="Requerido si hay existencias iniciales." {...field('unitCost')} />
              </>
            )}
          </div>
          {panel?.kind === 'edit' && <p className="text-xs text-subtle">Las existencias y el costo se modifican con “Entrada” o “Ajuste” para conservar el historial.</p>}
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setPanel(null)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={panel?.kind === 'purchase' || panel?.kind === 'adjust'}
        onClose={() => setPanel(null)}
        title={panel?.kind === 'purchase' ? 'Registrar entrada' : 'Ajuste de inventario'}
        description={panel && 'product' in panel && panel.product ? `${panel.product.name} · existencias actuales: ${panel.product.stock}` : undefined}
      >
        <form onSubmit={submitMovement} className="space-y-4" noValidate>
          <Input label={panel?.kind === 'purchase' ? 'Unidades compradas *' : 'Cantidad (+ entrada / − salida) *'} type="number" {...field('quantity')} />
          {panel?.kind === 'purchase' && (
            <Input label="Costo unitario (COP) *" type="number" min={0} step={100} hint="Actualiza el costo promedio ponderado." {...field('unitCost')} />
          )}
          <Input label={panel?.kind === 'purchase' ? 'Proveedor / nota' : 'Motivo *'} placeholder={panel?.kind === 'adjust' ? 'Conteo físico, daño, uso interno…' : ''} {...field('reason')} />
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setPanel(null)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={panel?.kind === 'movements'}
        onClose={() => setPanel(null)}
        title="Historial de movimientos"
        description={panel?.kind === 'movements' && panel.product ? panel.product.name : 'Últimos 200 movimientos'}
        size="xl"
      >
        {panel?.kind === 'movements' && <Movements product={panel.product} />}
      </Modal>
    </>
  );
};
