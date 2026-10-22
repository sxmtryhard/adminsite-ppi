import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Input';
import { Alert } from './Feedback';
import { toUserMessage } from '@/services/firebase/helpers';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'default';
  /** Si se define, pide un motivo (obligatorio) antes de confirmar. */
  reasonLabel?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

/** Confirmación de acciones irreversibles o sensibles, con manejo de error en línea. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  reasonLabel,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setReason('');
    setError(null);
    onCancel();
  };

  const confirm = async () => {
    if (reasonLabel && reason.trim().length < 3) {
      setError('Indica un motivo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason('');
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible completar la acción.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-muted">{message}</p>
        {reasonLabel && (
          <Textarea label={reasonLabel} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
        )}
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Volver
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'default'} onClick={confirm} isLoading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
