import React, { useEffect, useState } from 'react';
import { DollarSign, Calendar, Clock, Users, ArrowUpRight, Scissors } from 'lucide-react';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { clientsService } from '@/services/firebase/clients.service';
import { Appointment } from '@/types/appointment.types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link } from 'react-router-dom';

export const DashboardPlaceholder: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalClients, setTotalClients] = useState(0);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [appts, clients] = await Promise.all([
          appointmentsService.getAppointments(),
          clientsService.getClients(),
        ]);
        setAppointments(appts);
        setTotalClients(clients.length);
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Cálculos de métricas en tiempo real
  const completedAppointments = appointments.filter((a) => a.status === 'completed');
  const totalRevenue = completedAppointments.reduce((acc, curr) => acc + (curr.servicePrice || 0), 0);
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const pendingAppointments = appointments.filter((a) => a.status === 'pending');

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
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Panel Principal</h1>
          <p className="text-xs text-neutral-400">Resumen operativo general de XAC Barber Studio</p>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Ingresos Totales</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-neutral-100 font-mono">
            {loading ? '...' : formatCOP(totalRevenue)}
          </div>
          <p className="text-[11px] text-neutral-500">De citas finalizadas</p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Citas para Hoy</span>
            <Calendar className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-neutral-100 font-mono">
            {loading ? '...' : todayAppointments.length}
          </div>
          <p className="text-[11px] text-neutral-500">Agendadas para la fecha</p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Citas Pendientes</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-neutral-100 font-mono">
            {loading ? '...' : pendingAppointments.length}
          </div>
          <p className="text-[11px] text-neutral-500">En espera de atención</p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Clientes Totales</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-neutral-100 font-mono">
            {loading ? '...' : totalClients}
          </div>
          <p className="text-[11px] text-neutral-500">Registrados en el sistema</p>
        </div>
      </div>

      {/* Lista de Turnos Próximos */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Próximos Turnos</h2>
            <p className="text-xs text-neutral-400">Últimas citas registradas en agenda</p>
          </div>
          <Link
            to="/citas"
            className="text-xs text-neutral-400 hover:text-neutral-100 flex items-center gap-1 transition-colors"
          >
            Ver toda la agenda
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-neutral-800/60">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center justify-between animate-pulse">
                <div className="space-y-1">
                  <div className="h-3.5 w-32 bg-neutral-800 rounded" />
                  <div className="h-2.5 w-24 bg-neutral-800 rounded" />
                </div>
                <div className="h-6 w-16 bg-neutral-800 rounded" />
              </div>
            ))
          ) : appointments.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              No hay turnos registrados en este momento.
            </div>
          ) : (
            appointments.slice(0, 5).map((appt) => (
              <div key={appt.id} className="py-3 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-200">{appt.clientName}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">({appt.clientPhone})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-neutral-500" />
                      {appt.date} - {appt.time}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Scissors className="h-3 w-3 text-neutral-500" />
                      {appt.serviceName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-medium text-neutral-200">
                    {formatCOP(appt.servicePrice)}
                  </span>
                  <StatusBadge status={appt.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};