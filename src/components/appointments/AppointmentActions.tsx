import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, Play, ThumbsUp, UserX, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RescheduleModal } from './RescheduleModal';
import { useSession } from '@/context/auth-context';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { appointmentEvents } from '@/services/appointmentEvents';
import { toUserMessage } from '@/services/firebase/helpers';
import { clientCanModify, nextStatuses } from '@/domain/appointmentStatus';
import type { Appointment, AppointmentStatus } from '@/types/appointment.types';
import type { BusinessSettings } from '@/types/settings.types';

const ACTIONS: Partial<Record<AppointmentStatus, { label: string; icon: typeof Play; variant: 'subtle' | 'outline' }>> = {
  confirmed: { label: 'Confirmar', icon: ThumbsUp, variant: 'subtle' },
  in_progress: { label: 'Iniciar', icon: Play, variant: 'subtle' },
  completed: { label: 'Finalizar', icon: CheckCircle2, variant: 'subtle' },
  no_show: { label: 'No asistió', icon: UserX, variant: 'outline' },
};

/** Acciones permitidas según el rol y el estado. La validación final la hacen el servicio y las reglas. */
export const AppointmentActions: React.FC<{
  appointment: Appointment;
  settings: BusinessSettings;
  onChanged: () => void;
  onError: (message: string) => void;
}> = ({ appointment, settings, onChanged, onError }) => {
  const { user, actor } = useSession();
  const [busy, setBusy] = useState<AppointmentStatus | null>(null);
  const [confirming, setConfirming] = useState<'cancelled' | 'no_show' | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const allowed = nextStatuses(appointment.status, user.role);
  const withinPolicy =
    user.role !== 'client' ||
    clientCanModify(new Date(appointment.startAt), new Date(), settings.cancellationMinHours);
  const canReschedule = ['pending', 'confirmed'].includes(appointment.status) && withinPolicy;

  const change = async (to: AppointmentStatus, reason?: string) => {
    setBusy(to);
    try {
      const result = await appointmentsService.changeStatus(
        appointment.id,
        to,
        { role: user.role, cancellationMinHours: settings.cancellationMinHours, reason },
        actor
      );
      await appointmentEvents.statusChanged(result.appointment, to, result, actor, user.role).catch(() => undefined);
      onChanged();
    } catch (err) {
      // Desde el diálogo de confirmación el error se muestra dentro del propio diálogo.
      if (confirming) throw err;
      onError(toUserMessage(err, 'No fue posible actualizar la cita.'));
    } finally {
      setBusy(null);
    }
  };

  if (allowed.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowed
        .filter((s) => s !== 'cancelled')
        .map((status) => {
          const action = ACTIONS[status];
          if (!action) return null;
          const Icon = action.icon;
          return (
            <Button
              key={status}
              size="sm"
              variant={action.variant}
              isLoading={busy === status}
              onClick={() => (status === 'no_show' ? setConfirming('no_show') : change(status))}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {action.label}
            </Button>
          );
        })}
      {canReschedule && (
        <Button size="sm" variant="ghost" onClick={() => setRescheduling(true)}>
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Reprogramar
        </Button>
      )}
      {allowed.includes('cancelled') && (
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:text-danger"
          disabled={!withinPolicy}
          title={withinPolicy ? undefined : `Solo con ${settings.cancellationMinHours} h de antelación`}
          onClick={() => setConfirming('cancelled')}
        >
          <XCircle className="h-3.5 w-3.5" aria-hidden />
          Cancelar
        </Button>
      )}

      <ConfirmDialog
        isOpen={confirming !== null}
        title={confirming === 'no_show' ? 'Marcar inasistencia' : 'Cancelar cita'}
        message={
          confirming === 'no_show'
            ? 'La cita quedará registrada como no asistida y se liberará el horario.'
            : 'La cita se cancelará y el horario quedará disponible para otras reservas.'
        }
        confirmLabel={confirming === 'no_show' ? 'Marcar' : 'Cancelar cita'}
        reasonLabel={confirming === 'cancelled' ? 'Motivo de la cancelación' : undefined}
        onCancel={() => setConfirming(null)}
        onConfirm={async (reason) => {
          if (!confirming) return;
          await change(confirming, reason);
          setConfirming(null);
        }}
      />
      {rescheduling && (
        <RescheduleModal
          appointment={appointment}
          settings={settings}
          onClose={() => setRescheduling(false)}
          onDone={() => {
            setRescheduling(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
};
