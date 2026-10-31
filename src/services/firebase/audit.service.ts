import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from './firebase.config';
import { str, toIso } from './helpers';
import type { AuditAction, AuditEntry } from '@/types/audit.types';

export const AUDIT_LABELS: Record<AuditAction, string> = {
  'user.role_changed': 'Cambio de rol',
  'user.status_changed': 'Activación/desactivación de usuario',
  'staff.created': 'Alta de personal',
  'service.price_changed': 'Precio de servicio',
  'service.cost_changed': 'Costo de servicio',
  'service.status_changed': 'Estado de servicio',
  'product.price_changed': 'Precio de producto',
  'product.created': 'Producto creado',
  'product.status_changed': 'Estado de producto',
  'inventory.purchase': 'Entrada de inventario',
  'inventory.adjustment': 'Ajuste de inventario',
  'sale.created': 'Venta registrada',
  'sale.voided': 'Venta anulada',
  'expense.created': 'Gasto registrado',
  'expense.voided': 'Gasto anulado',
  'appointment.status_changed': 'Estado de cita',
  'appointment.rescheduled': 'Cita reprogramada',
  'barber.commission_changed': 'Comisión de barbero',
  'settings.updated': 'Configuración del negocio',
  'data.migrated': 'Migración de datos antiguos',
  'branding.updated': 'Logo del local',
};

export const auditService = {
  async list(max = 300): Promise<AuditEntry[]> {
    const snapshot = await getDocs(query(collection(db, 'auditLogs'), orderBy('at', 'desc'), limit(max)));
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        action: str(data.action) as AuditAction,
        entity: str(data.entity),
        entityId: str(data.entityId),
        actorUid: str(data.actorUid),
        actorName: str(data.actorName),
        details: (data.details ?? {}) as AuditEntry['details'],
        at: toIso(data.at),
      };
    });
  },
};
