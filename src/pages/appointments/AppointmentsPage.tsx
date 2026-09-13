import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Clock, CheckCircle2, XCircle, Trash2, Scissors, User } from 'lucide-react';
import { Appointment, CreateAppointmentDTO, AppointmentStatus } from '@/types/appointment.types';
import { Client } from '@/types/client.types';
import { ServiceItem } from '@/types/service.types';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { clientsService } from '@/services/firebase/clients.service';
import { servicesService } from '@/services/firebase/services.service';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [barberName, setBarberName] = useState('Barbero de turno');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [apptsData, clientsData, svcsData] = await Promise.all([
        appointmentsService.getAppointments(),
        clientsService.getClients(),
        servicesService.getServices(),
      ]);
      setAppointments(apptsData);
      setClients(clientsData);
      setServices(svcsData);
      if (svcsData.length > 0) setSelectedServiceId(svcsData[0].id);
      if (clientsData.length > 0) setSelectedClientId(clientsData[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado al cargar la agenda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const client = clients.find((c) => c.id === selectedClientId);
    const service = services.find((s) => s.id === selectedServiceId);

    if (!client || !service) {
      alert('Debes seleccionar un cliente y un servicio válidos.');
      setSubmitting(false);
      return;
    }

    const payload: CreateAppointmentDTO = {
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phone,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      durationMinutes: service.durationMinutes,
      barberName,
      date,
      time,
      status: 'pending',
      notes,
    };

    try {
      await appointmentsService.createAppointment(payload);
      setIsModalOpen(false);
      setNotes('');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar la cita.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      await appointmentsService.updateStatus(id, status);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch {
      alert('No fue posible actualizar el estado.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este turno agendado?')) return;
    try {
      await appointmentsService.deleteAppointment(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('No fue posible eliminar la cita.');
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
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Agenda de Citas</h1>
          <p className="text-xs text-neutral-400">Control de turnos y agenda diaria de XAC Barber Studio</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva Cita
        </Button>
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
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Servicio</th>
              <th className="py-3 px-4">Barbero</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-3.5 w-24 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-32 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-28 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-20 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-16 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-14 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-12 bg-neutral-800 rounded ml-auto" /></td>
                </tr>
              ))
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-500 space-y-2">
                  <Calendar className="h-8 w-8 mx-auto stroke-[1.25] text-neutral-600" />
                  <p>No hay citas agendadas aún.</p>
                </td>
              </tr>
            ) : (
              appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-neutral-900/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-neutral-200">{appt.date}</div>
                    <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {appt.time} ({appt.durationMinutes} min)
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-neutral-200">{appt.clientName}</div>
                    <div className="text-[11px] text-neutral-500 font-mono">{appt.clientPhone}</div>
                  </td>
                  <td className="py-3 px-4 text-neutral-300">
                    <div className="flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5 text-neutral-500" />
                      <span>{appt.serviceName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-300">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-neutral-500" />
                      <span>{appt.barberName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-neutral-200">
                    {formatCOP(appt.servicePrice)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={appt.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {appt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'completed')}
                            className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
                            title="Marcar completada"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                            className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
                            title="Cancelar cita"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(appt.id)}
                        className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Agendar Cita */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Agendar Nueva Cita"
        description="Selecciona cliente, servicio y fecha para la cita."
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4 pt-1">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-400">Cliente *</label>
            {clients.length === 0 ? (
              <p className="text-xs text-amber-400">No hay clientes registrados. Agrega uno primero en Clientes.</p>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="w-full h-9 rounded-md border border-neutral-800 bg-neutral-900/50 px-3 text-xs text-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-400">Servicio *</label>
            {services.length === 0 ? (
              <p className="text-xs text-amber-400">No hay servicios en la carta. Agrega uno primero en Servicios.</p>
            ) : (
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                required
                className="w-full h-9 rounded-md border border-neutral-800 bg-neutral-900/50 px-3 text-xs text-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {formatCOP(s.price)} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            )}
          </div>

          <Input
            label="Barbero asignado"
            placeholder="Ej. Carlos Restrepo"
            value={barberName}
            onChange={(e) => setBarberName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha *"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              label="Hora *"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-400">Notas adicionales</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre preferencias o requerimientos del cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900/50 p-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800/40">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={submitting}
              disabled={clients.length === 0 || services.length === 0}
            >
              Confirmar Cita
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};