import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, Phone, Award, Trash2, Power } from 'lucide-react';
import { Barber, CreateBarberDTO } from '@/types/barber.types';
import { barbersService } from '@/services/firebase/barbers.service';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';

export const BarbersPage: React.FC = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateBarberDTO>({
    fullName: '',
    phone: '',
    specialty: 'Cortes Clásicos y Fade',
    status: 'active',
  });

  const loadBarbers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await barbersService.getBarbers();
      setBarbers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarbers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await barbersService.createBarber(formData);
      setIsModalOpen(false);
      setFormData({
        fullName: '',
        phone: '',
        specialty: 'Cortes Clásicos y Fade',
        status: 'active',
      });
      await loadBarbers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el barbero.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (barber: Barber) => {
    const nextStatus = barber.status === 'active' ? 'inactive' : 'active';
    try {
      await barbersService.updateBarberStatus(barber.id, nextStatus);
      setBarbers((prev) =>
        prev.map((b) => (b.id === barber.id ? { ...b, status: nextStatus } : b))
      );
    } catch {
      alert('No fue posible cambiar el estado.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Deseas dar de baja a este barbero del equipo?')) return;
    try {
      await barbersService.deleteBarber(id);
      setBarbers((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert('No fue posible eliminar el barbero.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Equipo de Barberos</h1>
          <p className="text-xs text-neutral-400">Staff profesional de XAC Barber Studio</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo Barbero
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border bg-neutral-950 p-5 rounded-xl space-y-3 animate-pulse">
              <div className="h-10 w-10 bg-neutral-800 rounded-full" />
              <div className="h-4 bg-neutral-800 rounded w-2/3" />
              <div className="h-3 bg-neutral-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : barbers.length === 0 ? (
        <div className="border border-border/60 bg-neutral-950 rounded-lg p-12 text-center text-neutral-500 space-y-3">
          <UserCheck className="h-8 w-8 mx-auto stroke-[1.25] text-neutral-600" />
          <p className="text-xs">No hay barberos registrados en el equipo aún.</p>
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            Agregar primer barbero
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="border border-border/80 bg-neutral-950 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-neutral-200 text-sm">
                    {barber.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <StatusBadge status={barber.status} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-100">{barber.fullName}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                    <Award className="h-3.5 w-3.5 text-neutral-500" />
                    <span>{barber.specialty}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-neutral-500" />
                    <span>{barber.phone || 'Sin teléfono'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-end gap-1">
                <button
                  onClick={() => handleToggleStatus(barber)}
                  className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 rounded transition-colors"
                  title={barber.status === 'active' ? 'Marcar inactivo' : 'Marcar activo'}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(barber.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded transition-colors"
                  title="Eliminar barbero"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Barbero"
        description="Añade un miembro al equipo de trabajo de XAC Studio."
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-1">
          <Input
            label="Nombre Completo *"
            placeholder="Ej. Carlos Restrepo"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />

          <Input
            label="Teléfono *"
            placeholder="+57 311 000 0000"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <Input
            label="Especialidad *"
            placeholder="Ej. Fade Master, Barbas y Diseños"
            required
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              Guardar Barbero
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};