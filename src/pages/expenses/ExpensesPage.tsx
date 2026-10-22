import React, { useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Alert, EmptyState, SkeletonRows } from '@/components/common/Feedback';
import { Badge } from '@/components/common/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { expensesService } from '@/services/firebase/expenses.service';
import { toUserMessage } from '@/services/firebase/helpers';
import { addDays, businessDate } from '@/domain/time';
import { hasErrors, validateMoney, type FieldErrors } from '@/domain/validation';
import { formatCOP } from '@/lib/format';
import { EXPENSE_CATEGORY_LABELS, type Expense, type ExpenseCategory } from '@/types/expense.types';

export const ExpensesPage: React.FC = () => {
  const { actor } = useSession();
  const today = businessDate();
  const [range, setRange] = useState({ from: `${today.slice(0, 7)}-01`, to: today });
  const expenses = useAsync(() => expensesService.listByRange(range.from, range.to), [range.from, range.to]);
  const [open, setOpen] = useState(false);
  const [voiding, setVoiding] = useState<Expense | null>(null);
  const [form, setForm] = useState({ date: today, category: 'rent' as ExpenseCategory, description: '', amount: '' });
  const [errors, setErrors] = useState<FieldErrors<'amount' | 'date' | 'description'>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = (expenses.data ?? []).filter((e) => e.status === 'active');
  const total = active.reduce((s, e) => s + e.amount, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    const next = {
      amount: validateMoney(amount, { allowZero: false }),
      date: form.date && form.date <= addDays(today, 31) ? undefined : 'Fecha inválida.',
      description: form.description.trim().length >= 3 ? undefined : 'Describe el gasto.',
    };
    setErrors(next);
    if (hasErrors(next)) return;
    setSaving(true);
    setError(null);
    try {
      await expensesService.create({ date: form.date, category: form.category, description: form.description, amount }, actor);
      setOpen(false);
      setForm({ date: today, category: 'rent', description: '', amount: '' });
      expenses.reload();
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible registrar el gasto.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Gastos operativos"
        description="Arriendo, servicios, nómina y demás gastos que no son costo directo. Alimentan la utilidad neta."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Registrar gasto
          </Button>
        }
      />
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="grid grid-cols-2 gap-2 sm:w-80">
          <Input label="Desde" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <Input label="Hasta" type="date" min={range.from} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted">Total del periodo</p>
          <p className="text-xl font-semibold text-ink">{formatCOP(total)}</p>
        </div>
      </div>
      {expenses.error && <Alert>{expenses.error}</Alert>}
      <div className="card overflow-hidden">
        {expenses.loading ? (
          <SkeletonRows />
        ) : (expenses.data ?? []).length === 0 ? (
          <EmptyState icon={Receipt} title="Sin gastos en el periodo" description="Registra los gastos para calcular la utilidad neta real." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[640px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th className="text-right">Monto</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {(expenses.data ?? []).map((e) => (
                  <tr key={e.id} className={e.status === 'voided' ? 'opacity-50' : undefined}>
                    <td className="whitespace-nowrap">{e.date}</td>
                    <td>{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</td>
                    <td>{e.description}</td>
                    <td className={`text-right font-medium tabular-nums ${e.status === 'voided' ? 'line-through' : ''}`}>{formatCOP(e.amount)}</td>
                    <td className="text-right">
                      {e.status === 'voided' ? (
                        <Badge>Anulado</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-danger" onClick={() => setVoiding(e)}>
                          Anular
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Registrar gasto" description="Las compras de inventario se registran en Inventario › Entrada.">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Fecha *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
            <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <Input label="Descripción *" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} />
          <Input label="Monto (COP) *" type="number" min={1} step={100} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount} />
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={voiding !== null}
        title="Anular gasto"
        message={`El gasto de ${voiding ? formatCOP(voiding.amount) : ''} dejará de contar en los reportes. Quedará visible como anulado.`}
        confirmLabel="Anular"
        onCancel={() => setVoiding(null)}
        onConfirm={async () => {
          if (!voiding) return;
          await expensesService.voidExpense(voiding, actor);
          setVoiding(null);
          expenses.reload();
        }}
      />
    </>
  );
};
