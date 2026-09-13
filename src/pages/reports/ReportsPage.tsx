import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Scissors, Package, Users, Banknote, CreditCard } from 'lucide-react';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { salesService } from '@/services/firebase/sales.service';
import { Appointment } from '@/types/appointment.types';
import { Sale } from '@/types/sale.types';

export const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptsData, salesData] = await Promise.all([
          appointmentsService.getAppointments(),
          salesService.getSales(),
        ]);
        setAppointments(apptsData);
        setSales(salesData);
      } catch (err) {
        console.error('Error cargando reportes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  // 1. Desglose de ingresos
  const completedAppts = appointments.filter((a) => a.status === 'completed');
  const apptsRevenue = completedAppts.reduce((sum, a) => sum + (a.servicePrice || 0), 0);
  const posRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalGrossRevenue = apptsRevenue + posRevenue;

  // 2. Métodos de pago en POS
  const cashTotal = sales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + s.total, 0);
  const transferTotal = sales
    .filter((s) => s.paymentMethod === 'transfer')
    .reduce((sum, s) => sum + s.total, 0);

  // 3. Top Servicios más realizados
  const serviceCountMap: Record<string, number> = {};
  completedAppts.forEach((a) => {
    serviceCountMap[a.serviceName] = (serviceCountMap[a.serviceName] || 0) + 1;
  });
  sales.forEach((s) => {
    s.items.forEach((item) => {
      if (item.type === 'service') {
        serviceCountMap[item.name] = (serviceCountMap[item.name] || 0) + item.quantity;
      }
    });
  });

  const sortedServices = Object.entries(serviceCountMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // 4. Rendimiento por Barbero
  const barberMap: Record<string, { count: number; total: number }> = {};
  completedAppts.forEach((a) => {
    const name = a.barberName || 'Sin asignar';
    if (!barberMap[name]) barberMap[name] = { count: 0, total: 0 };
    barberMap[name].count += 1;
    barberMap[name].total += a.servicePrice || 0;
  });
  sales.forEach((s) => {
    if (s.barberName) {
      const name = s.barberName;
      if (!barberMap[name]) barberMap[name] = { count: 0, total: 0 };
      barberMap[name].total += s.total;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Reportes Financieros y Métricas</h1>
        <p className="text-xs text-neutral-400">Balance operativo general y estadísticas de XAC Barber Studio</p>
      </div>

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Facturación Global</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-neutral-100">
            {loading ? '...' : formatCOP(totalGrossRevenue)}
          </p>
          <p className="text-[11px] text-neutral-500">Citas finalizadas + Caja de mostrador</p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Ingresos por Agenda</span>
            <Scissors className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xl font-bold font-mono text-neutral-100">
            {loading ? '...' : formatCOP(apptsRevenue)}
          </p>
          <p className="text-[11px] text-neutral-500">{completedAppts.length} citas completadas</p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Ingresos por Caja / POS</span>
            <Package className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-neutral-100">
            {loading ? '...' : formatCOP(posRevenue)}
          </p>
          <p className="text-[11px] text-neutral-500">{sales.length} ventas procesadas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimiento de Barberos */}
        <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-neutral-200 text-sm font-semibold">
            <Users className="h-4 w-4 text-neutral-400" />
            <span>Rendimiento del Staff</span>
          </div>

          <div className="divide-y divide-neutral-800/60">
            {loading ? (
              <p className="text-xs text-neutral-500 py-4">Cargando datos...</p>
            ) : Object.keys(barberMap).length === 0 ? (
              <p className="text-xs text-neutral-500 py-4">No hay servicios asociados a barberos aún.</p>
            ) : (
              Object.entries(barberMap).map(([name, stat]) => (
                <div key={name} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-neutral-200">{name}</p>
                    <p className="text-[11px] text-neutral-500">{stat.count} servicios completados</p>
                  </div>
                  <span className="font-mono font-semibold text-emerald-400">{formatCOP(stat.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Canales de Pago */}
        <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-neutral-200 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-neutral-400" />
            <span>Métodos de Pago en Mostrador</span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-900/30">
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                <Banknote className="h-4 w-4 text-emerald-400" />
                <span>Efectivo en Caja</span>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-100">{formatCOP(cashTotal)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-900/30">
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <span>Transferencias / Bancos</span>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-100">{formatCOP(transferTotal)}</span>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-medium text-neutral-400 mb-2">Servicios más solicitados</p>
            <div className="space-y-1.5">
              {sortedServices.map(([sName, count]) => (
                <div key={sName} className="flex justify-between text-xs text-neutral-300">
                  <span className="truncate">{sName}</span>
                  <span className="font-mono text-neutral-500">{count} veces</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};