import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, UserPlus, Phone, Mail, FileText } from 'lucide-react';
import { Client, CreateClientDTO } from '@/types/client.types';
import { clientsService } from '@/services/firebase/clients.service';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateClientDTO>({
    fullName: '',
    email: '',
    phone: '',
    notes: '',
    status: 'active',
  });

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientsService.getClients();
      setClients(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado al cargar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await clientsService.createClient(formData);
      setIsModalOpen(false);
      setFormData({ fullName: '', email: '', phone: '', notes: '', status: 'active' });
      await loadClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este cliente?')) return;
    try {
      await clientsService.deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('No fue posible eliminar el registro.');
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Clientes</h1>
          <p className="text-xs text-neutral-400">Directorio de clientes de XAC Barber Studio</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-md bg-neutral-900/50 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 transition-colors"
          />
        </div>
        <span className="text-xs text-neutral-500 font-mono">
          {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-800 bg-neutral-900/40 text-neutral-400 font-medium select-none">
            <tr>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Teléfono</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Citas</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-3.5 w-32 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-24 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-16 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-10 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-8 bg-neutral-800 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-neutral-500 space-y-2">
                  <UserPlus className="h-8 w-8 mx-auto stroke-[1.25] text-neutral-600" />
                  <p>No se encontraron clientes registrados.</p>
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-neutral-900/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-neutral-200">{client.fullName}</div>
                    <div className="text-[11px] text-neutral-500">{client.email || 'Sin correo registrado'}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-300">{client.phone}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-300">{client.totalAppointments}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nuevo Cliente"
        description="Ingresa los datos para registrar un cliente en la barbería."
      >
        <form onSubmit={handleCreateClient} className="space-y-4 pt-2">
          <Input
            label="Nombre Completo *"
            placeholder="Ej. Mateo Gómez"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />

          <Input
            label="Número de Teléfono *"
            placeholder="Ej. +57 300 123 4567"
            type="tel"
            required
            icon={<Phone className="h-3.5 w-3.5" />}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <Input
            label="Correo Electrónico"
            placeholder="cliente@ejemplo.com"
            type="email"
            icon={<Mail className="h-3.5 w-3.5" />}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-400 select-none flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Notas u Observaciones
            </label>
            <textarea
              rows={3}
              placeholder="Preferencias de corte o detalles relevantes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900/50 p-2.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800/40">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              Guardar Cliente
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};