import React from 'react';
import { Phone, Scissors, User, Wallet } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCOP } from '@/lib/format';
import { formatLongDate } from '@/domain/time';
import type { Appointment } from '@/types/appointment.types';

/** Tarjeta de cita para la vista del barbero y del cliente. */
export const AppointmentCard: React.FC<{
  appointment: Appointment;
  perspective: 'barber' | 'client';
  actions?: React.ReactNode;
}> = ({ appointment: a, perspective, actions }) => (
  <article className="card p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface-2 text-center">
          <span className="text-base font-semibold tabular-nums text-ink">{a.time}</span>
          <span className="text-[10px] text-subtle">{a.durationMinutes} min</span>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-ink">{a.serviceName}</p>
          <p className="text-xs capitalize text-muted">{formatLongDate(a.date)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {perspective === 'barber' ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" aria-hidden /> {a.clientName}
                </span>
                {a.clientPhone && (
                  <a href={`tel:${a.clientPhone}`} className="inline-flex items-center gap-1 hover:text-ink">
                    <Phone className="h-3 w-3" aria-hidden /> {a.clientPhone}
                  </a>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Scissors className="h-3 w-3" aria-hidden /> {a.barberName}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-3 w-3" aria-hidden /> {formatCOP(a.servicePrice)}
            </span>
          </div>
          {a.notes && <p className="text-xs italic text-subtle">“{a.notes}”</p>}
          {a.cancelReason && a.status === 'cancelled' && (
            <p className="text-xs text-danger/80">Motivo: {a.cancelReason}</p>
          )}
        </div>
      </div>
      <StatusBadge status={a.status} />
    </div>
    {actions && <div className="mt-4 border-t border-line pt-3">{actions}</div>}
  </article>
);
