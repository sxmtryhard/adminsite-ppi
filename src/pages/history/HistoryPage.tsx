import React, { useEffect, useState } from 'react';
import {
  History,
  Calendar,
  Banknote,
  CreditCard,
  Search,
  User,
  Download,
} from 'lucide-react';
import { Sale } from '@/types/sale.types';
import { salesService } from '@/services/firebase/sales.service';

export const HistoryPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'transfer'>('all');
  const [search, setSearch] = useState('');

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await salesService.getSales();
      setSales(data);
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const filteredSales = sales.filter((s) => {
    const matchesMethod = filterMethod === 'all' || s.paymentMethod === filterMethod;
    const matchesSearch =
      (s.barberName && s.barberName.toLowerCase().includes(search.toLowerCase())) ||
      s.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    return matchesMethod && matchesSearch;
  });

  const totalCollected = filteredSales.reduce((acc, curr) => acc + curr.total, 0);

  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      alert('No hay datos en la tabla para exportar.');
      return;
    }

    const headers = ['Fecha y Hora', 'Items Facturados', 'Barbero', 'Metodo de Pago', 'Total COP'];
    const rows = filteredSales.map((sale) => [
      sale.createdAt
        ? `"${new Date(sale.createdAt).toLocaleString('es-CO').replace(/"/g, '""')}"`
        : '"Reciente"',
      `"${sale.items.map((i) => `${i.quantity}x ${i.name}`).join(' | ').replace(/"/g, '""')}"`,
      `"${(sale.barberName || 'Sin asignar').replace(/"/g, '""')}"`,
      `"${sale.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}"`,
      sale.total,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `arqueo_caja_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Historial de Caja</h1>
          <p className="text-xs text-neutral-400">Registro de todas las transacciones cobradas en mostrador</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
          <div className="text-right border-l border-neutral-800 pl-3">
            <p className="text-xs text-neutral-400">Total filtrado</p>
            <p className="text-lg font-bold font-mono text-emerald-400">{formatCOP(totalCollected)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por barbero o producto/servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-md bg-neutral-900/50 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400"
          />
        </div>

        <div className="flex gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMethod('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              filterMethod === 'all'
                ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterMethod('cash')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterMethod === 'cash'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
            }`}
          >
            <Banknote className="h-3.5 w-3.5" />
            Efectivo
          </button>
          <button
            type="button"
            onClick={() => setFilterMethod('transfer')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterMethod === 'transfer'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Transferencia
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-800 bg-neutral-900/40 text-neutral-400 font-medium">
            <tr>
              <th className="py-3 px-4">Fecha y Hora</th>
              <th className="py-3 px-4">Detalle de Ítems</th>
              <th className="py-3 px-4">Barbero</th>
              <th className="py-3 px-4">Método</th>
              <th className="py-3 px-4 text-right">Monto Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-3.5 w-24 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-40 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-20 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-16 bg-neutral-800 rounded" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-3.5 w-16 bg-neutral-800 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-neutral-500 space-y-2">
                  <History className="h-8 w-8 mx-auto stroke-[1.25] text-neutral-600" />
                  <p>No se registran transacciones con los filtros seleccionados.</p>
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-neutral-900/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                      <span>
                        {sale.createdAt
                          ? new Date(sale.createdAt).toLocaleString('es-CO', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Reciente'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      {sale.items.map((it, idx) => (
                        <div key={idx} className="text-neutral-300">
                          <span className="font-mono text-neutral-500 mr-1.5">{it.quantity}x</span>
                          <span>{it.name}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-300">
                    {sale.barberName ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-neutral-500" />
                        <span>{sale.barberName}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-600 italic">No especificado</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono capitalize border ${
                        sale.paymentMethod === 'cash'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {sale.paymentMethod === 'cash' ? (
                        <Banknote className="h-3 w-3" />
                      ) : (
                        <CreditCard className="h-3 w-3" />
                      )}
                      {sale.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-neutral-100">
                    {formatCOP(sale.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};