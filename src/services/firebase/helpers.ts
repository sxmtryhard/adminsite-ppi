import { FirebaseError } from 'firebase/app';
import { Timestamp, collection, doc, serverTimestamp, type Transaction, type WriteBatch } from 'firebase/firestore';
import { db } from './firebase.config';
import type { AuditAction } from '@/types/audit.types';

/** Quién ejecuta una operación. Se toma del perfil autenticado, nunca de un formulario. */
export interface Actor {
  uid: string;
  name: string;
}

/** Error con mensaje apto para mostrar al usuario. */
export class AppError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const FIRESTORE_MESSAGES: Record<string, string> = {
  'permission-denied': 'No tienes permiso para realizar esta acción.',
  unavailable: 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  'deadline-exceeded': 'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
  aborted: 'La operación entró en conflicto con otro cambio. Inténtalo de nuevo.',
  'failed-precondition': 'La operación no se pudo completar en el estado actual de los datos.',
  'not-found': 'El registro ya no existe.',
};

/** Convierte cualquier error en un mensaje seguro (sin detalles internos). */
export const toUserMessage = (err: unknown, fallback = 'Ocurrió un error inesperado.'): string => {
  if (err instanceof AppError) return err.message;
  if (err instanceof FirebaseError) {
    const code = err.code.replace(/^firestore\//, '');
    return FIRESTORE_MESSAGES[code] ?? fallback;
  }
  return fallback;
};

export const toIso = (value: unknown): string => {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  // serverTimestamp pendiente de confirmar (escritura local): se usa la hora actual.
  return new Date().toISOString();
};

export const toIsoOrNull = (value: unknown): string | null => (value ? toIso(value) : null);

export const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
export const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
export const numOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
export const strOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

/** Agrega una entrada de auditoría a una transacción o lote, para que sea atómica con la operación. */
export const addAudit = (
  writer: Transaction | WriteBatch,
  actor: Actor,
  action: AuditAction,
  entity: string,
  entityId: string,
  details: Record<string, string | number | boolean | null> = {}
): void => {
  const ref = doc(collection(db, 'auditLogs'));
  (writer as WriteBatch).set(ref, {
    action,
    entity,
    entityId,
    actorUid: actor.uid,
    actorName: actor.name,
    details,
    at: serverTimestamp(),
  });
};
