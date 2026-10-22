export type AuditAction =
  | 'user.role_changed'
  | 'user.status_changed'
  | 'staff.created'
  | 'service.price_changed'
  | 'service.cost_changed'
  | 'service.status_changed'
  | 'product.price_changed'
  | 'product.created'
  | 'product.status_changed'
  | 'inventory.purchase'
  | 'inventory.adjustment'
  | 'sale.created'
  | 'sale.voided'
  | 'expense.created'
  | 'expense.voided'
  | 'appointment.status_changed'
  | 'appointment.rescheduled'
  | 'barber.commission_changed'
  | 'settings.updated';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  actorUid: string;
  actorName: string;
  /** Resumen sin datos sensibles (sin contraseñas, tokens, correos ni teléfonos). */
  details: Record<string, string | number | boolean | null>;
  at: string;
}
