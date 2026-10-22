import React, { useState } from 'react';
import { Clock, Pencil, Plus, Scissors } from 'lucide-react';
import { PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Select, Textarea } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Alert, EmptyState, SkeletonRows } from '@/components/common/Feedback';
import { ActiveBadge, Badge } from '@/components/common/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { servicesService } from '@/services/firebase/services.service';
import { toUserMessage } from '@/services/firebase/helpers';
import { MAX_SERVICE_MINUTES } from '@/domain/availability';
import { marginPct } from '@/domain/finance';
import { hasErrors, validateMoney, validateName, type FieldErrors } from '@/domain/validation';
import { formatCOP, formatPct } from '@/lib/format';
import { SERVICE_CATEGORY_LABELS, type ServiceCategory, type ServiceItem } from '@/types/service.types';

type Field = 'name' | 'price' | 'durationMinutes' | 'directCost';

const emptyForm = { name: '', description: '', price: '', durationMinutes: '30', category: 'haircut' as ServiceCategory, status: 'active' as ServiceItem['status'], directCost: '' };

export const ServicesPage: React.FC = () => {
  const { actor } = useSession();
  const data = useAsync(() => Promise.all([servicesService.getServices(), servicesService.getCosts()]), []);
  const [services, costs] = data.data ?? [[], new Map<string, number | null>()];
  const [editing, setEditing] = useState<ServiceItem | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (svc: ServiceItem | 'new') => {
    setEditing(svc);
    setErrors({});
    setError(null);
    if (svc === 'new') setForm(emptyForm);
    else {
      const cost = costs.get(svc.id);
      setForm({
        name: svc.name,
        description: svc.description,
        price: String(svc.price),
        durationMinutes: String(svc.durationMinutes),
        category: svc.category,
        status: svc.status,
        directCost: cost === null || cost === undefined ? '' : String(cost),
      });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price);
    const duration = Number(form.durationMinutes);
    const directCost = form.directCost.trim() === '' ? null : Number(form.directCost);
    const next: FieldErrors<Field> = {
      name: validateName(form.name),
      price: validateMoney(price, { allowZero: false }),
      durationMinutes:
        Number.isInteger(duration) && duration >= 5 && duration <= MAX_SERVICE_MINUTES ? undefined : `Entre 5 y ${MAX_SERVICE_MINUTES} minutos.`,
      directCost: directCost === null ? undefined : validateMoney(directCost),
    };
    setErrors(next);
    if (hasErrors(next) || !editing) return;
    const dto = { name: form.name, description: form.description, price, durationMinutes: duration, category: form.category, status: form.status };
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') await servicesService.createService(dto, directCost, actor);
      else await servicesService.updateService(editing, dto, costs.get(editing.id) ?? null, directCost, actor);
      setEditing(null);
      data.reload();
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible guardar el servicio.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Servicios y precios"
        description="Catálogo visible para clientes. Los costos directos son privados y alimentan los márgenes."
        actions={
          <Button onClick={() => open('new')}>
            <Plus className="h-4 w-4" aria-hidden /> Nuevo servicio
          </Button>
        }
      />
      {data.error && <Alert>{data.error}</Alert>}
      <div className="card overflow-hidden">
        {data.loading ? (
          <SkeletonRows />
        ) : services.length === 0 ? (
          <EmptyState icon={Scissors} title="No hay servicios" description="Crea el primer servicio para habilitar reservas y ventas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Duración</th>
                  <th>Precio</th>
                  <th>Costo directo</th>
                  <th>Margen bruto</th>
                  <th>Estado</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const cost = costs.get(s.id) ?? null;
                  return (
                    <tr key={s.id}>
                      <td>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-subtle">{SERVICE_CATEGORY_LABELS[s.category] ?? s.category}</p>
                      </td>
                      <td className="whitespace-nowrap">
                        <Clock className="mr-1 inline h-3.5 w-3.5 text-subtle" aria-hidden />
                        {s.durationMinutes} min
                      </td>
                      <td className="font-medium">{formatCOP(s.price)}</td>
                      <td>{cost === null ? <Badge tone="warning">Sin configurar</Badge> : formatCOP(cost)}</td>
                      <td>{cost === null ? '—' : formatPct(marginPct(s.price - cost, s.price))}</td>
                      <td>
                        <ActiveBadge active={s.status === 'active'} />
                      </td>
                      <td className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => open(s)}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo servicio' : 'Editar servicio'} description="Los cambios de precio y costo quedan en la auditoría.">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input label="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Textarea label="Descripción" maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Precio (COP) *" type="number" min={0} step={500} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} error={errors.price} />
            <Input
              label="Duración (min) *"
              type="number"
              min={5}
              max={MAX_SERVICE_MINUTES}
              step={5}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              error={errors.durationMinutes}
            />
            <Input
              label="Costo directo (COP)"
              type="number"
              min={0}
              step={100}
              placeholder="Sin configurar"
              value={form.directCost}
              onChange={(e) => setForm({ ...form, directCost: e.target.value })}
              error={errors.directCost}
              hint="Insumos por servicio. Vacío = no configurado (los márgenes se marcarán incompletos)."
            />
            <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}>
              {Object.entries(SERVICE_CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ServiceItem['status'] })}>
              <option value="active">Activo (visible y reservable)</option>
              <option value="inactive">Inactivo</option>
            </Select>
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
