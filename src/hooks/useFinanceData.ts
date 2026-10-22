import { useMemo } from 'react';
import { useAsync } from './useAsync';
import { salesService } from '@/services/firebase/sales.service';
import { expensesService } from '@/services/firebase/expenses.service';
import { appointmentsService } from '@/services/firebase/appointments.service';
import {
  barberPerformance,
  computeFinancials,
  countByStatus,
  dailySeries,
  previousPeriod,
  rankItems,
  type Period,
} from '@/domain/finance';

/**
 * Carga una sola vez el periodo actual y el anterior (misma duración) y calcula los indicadores
 * con las funciones puras de `domain/finance` (cubiertas por pruebas unitarias).
 */
export const useFinanceData = (period: Period) => {
  const previous = previousPeriod(period);
  const raw = useAsync(
    () =>
      Promise.all([
        salesService.listByRange(previous.from, period.to),
        salesService.costsByRange(previous.from, period.to),
        expensesService.listByRange(previous.from, period.to),
        appointmentsService.listByRange(previous.from, period.to),
      ]),
    [period.from, period.to]
  );

  const computed = useMemo(() => {
    if (!raw.data) return null;
    const [sales, costs, expenses, appointments] = raw.data;
    return {
      sales,
      appointments,
      current: computeFinancials(sales, costs, expenses, period),
      previous: computeFinancials(sales, costs, expenses, previous),
      statusCounts: countByStatus(appointments, period),
      previousStatusCounts: countByStatus(appointments, previous),
      topServices: rankItems(sales, costs, period, 'service'),
      topProducts: rankItems(sales, costs, period, 'product'),
      barbers: barberPerformance(sales, appointments, period),
      series: dailySeries(sales, costs, expenses, period),
    };
    // previous se deriva de period
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw.data, period.from, period.to]);

  return { loading: raw.loading, error: raw.error, reload: raw.reload, data: computed, previous };
};
