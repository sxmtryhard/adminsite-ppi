import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, num, str, toIso, type Actor } from './helpers';
import type { CreateExpenseInput, Expense, ExpenseCategory } from '@/types/expense.types';
import { cleanText } from '@/domain/validation';

const COLLECTION_NAME = 'expenses';

export const expensesService = {
  async listByRange(from: string, to: string): Promise<Expense[]> {
    const q = query(collection(db, COLLECTION_NAME), where('date', '>=', from), where('date', '<=', to));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: str(data.date),
          category: str(data.category, 'other') as ExpenseCategory,
          description: str(data.description),
          amount: num(data.amount),
          status: data.status === 'voided' ? 'voided' : 'active',
          createdBy: str(data.createdBy),
          createdAt: toIso(data.createdAt),
        } satisfies Expense;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async create(input: CreateExpenseInput, actor: Actor): Promise<void> {
    const ref = doc(collection(db, COLLECTION_NAME));
    const batch = writeBatch(db);
    batch.set(ref, {
      ...input,
      description: cleanText(input.description, 200),
      status: 'active',
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
    });
    addAudit(batch, actor, 'expense.created', 'expenses', ref.id, { amount: input.amount, category: input.category });
    await batch.commit();
  },

  /** Los gastos no se borran: se anulan y quedan en el historial. */
  async voidExpense(expense: Expense, actor: Actor): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION_NAME, expense.id), { status: 'voided' });
    addAudit(batch, actor, 'expense.voided', 'expenses', expense.id, { amount: expense.amount });
    await batch.commit();
  },
};
