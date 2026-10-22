export type ExpenseCategory = 'rent' | 'utilities' | 'payroll' | 'supplies' | 'marketing' | 'maintenance' | 'other';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Arriendo',
  utilities: 'Servicios públicos',
  payroll: 'Nómina / comisiones',
  supplies: 'Insumos generales',
  marketing: 'Publicidad',
  maintenance: 'Mantenimiento',
  other: 'Otros',
};

/** Gasto operativo (no incluye compras de inventario, que se registran como movimientos). */
export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number;
  status: 'active' | 'voided';
  createdBy: string;
  createdAt: string;
}

export type CreateExpenseInput = Pick<Expense, 'date' | 'category' | 'description' | 'amount'>;
