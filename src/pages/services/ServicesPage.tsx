import React, { useEffect, useState } from 'react';
import { Plus, Scissors, Clock, DollarSign, Trash2, Power } from 'lucide-react';
import { ServiceItem, CreateServiceDTO } from '@/types/service.types';
import { servicesService } from '@/services/firebase/services.service';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';

const categoryLabels: Record<ServiceItem['category'], string> = {
  haircut: 'Corte',
  beard: 'Barba',
  combo: 'Combo',
  treatment: 'Tratamiento',
  other: 'Otro',
};

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateServiceDTO>({
    name: '',
    description: '',
    price: 35000,
    durationMinutes: 45,
    category: 'haircut',
    status: 'active',
  });

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await servicesService.getServices();
      setServices(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await servicesService.createService({
        ...formData,
        price: Number(formData.price),
        durationMinutes: Number(formData.durationMinutes),
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        price: 35000,
        durationMinutes: 45,
        category: 'haircut',
        status: 'active',
      });
      await loadServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (service: ServiceItem) => {
    const nextStatus = service.status === 'active' ? 'inactive' : 'active';
    try {
      await servicesService.updateServiceStatus(service.id, nextStatus);
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, status: nextStatus } : s))
      );
    } catch {
      alert('No fue posible cambiar el estado.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este servicio de la carta?')) return;
    try {
      await servicesService.deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert('No fue posible eliminar el servicio.');
    }
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Servicios</h1>
          <p className="text-xs text-neutral-400">Catálogo de tarifas y tiempos de atención</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo Servicio
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border bg-neutral-950 p-5 rounded-lg space-y-3 animate-pulse">
              <div className="h-4 bg-neutral-800 rounded w-2/3" />
              <div className="h-3 bg-neutral-800 rounded w-full" />
              <div className="h-6 bg-neutral-800 rounded w-1/3 pt-2" />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="border border-border/60 bg-neutral-950 rounded-lg p-12 text-center text-neutral-500 space-y-3">
          <Scissors className="h-8 w-8 mx-auto stroke-[1.25] text-neutral-600" />
          <p className="text-xs">No hay servicios registrados aún.</p>
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            Agregar el primer servicio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="border border-border/80 bg-neutral-950 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    {categoryLabels[svc.category]}
                  </span>
                  <StatusBadge status={svc.status} />
                </div>

                <h3 className="text-base font-semibold text-neutral-100 tracking-tight">
                  {svc.name}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-light">
                  {svc.description || 'Sin descripción adicional.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-bold text-neutral-100 font-mono">
                    {formatCOP(svc.price)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                    <Clock className="h-3 w-3" />
                    <span>{svc.durationMinutes} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleStatus(svc)}
                    className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 rounded transition-colors"
                    title={svc.status === 'active' ? 'Desactivar servicio' : 'Activar servicio'}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded transition-colors"
                    title="Eliminar servicio"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Servicio"
        description="Añade un corte, afeitado o tratamiento al catálogo."
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-1">
          <Input
            label="Nombre del Servicio *"
            placeholder="Ej. Fade Clásico + Perfilado"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio (COP) *"
              type="number"
              min="0"
              step="1000"
              required
              icon={<DollarSign className="h-3.5 w-3.5" />}
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            />

            <Input
              label="Duración (Minutos) *"
              type="number"
              min="10"
              step="5"
              required
              icon={<Clock className="h-3.5 w-3.5" />}
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-400 select-none">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceItem['category'] })}
              className="w-full h-9 rounded-md border border-border bg-neutral-900/50 px-3 text-xs text-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
            >
              <option value="haircut">Corte</option>
              <option value="beard">Barba</option>
              <option value="combo">Combo (Corte + Barba)</option>
              <option value="treatment">Tratamiento</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-400 select-none">Descripción</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre el acabado o técnica..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-border bg-neutral-900/50 p-2.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              Guardar Servicio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};