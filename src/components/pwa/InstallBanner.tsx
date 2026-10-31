import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BrandMark } from '@/components/common/BrandMark';
import { useInstallMode } from '@/lib/installPrompt';
import { InstallActions } from './InstallActions';

const DISMISS_KEY = 'adminsite.install.dismissedAt';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const wasDismissed = (): boolean => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

/** Invitación a instalar la app. Se oculta si ya está instalada o si la cerraron hace menos de 14 días. */
export const InstallBanner: React.FC<{ isClient: boolean }> = ({ isClient }) => {
  const mode = useInstallMode();
  const [hidden, setHidden] = useState(wasDismissed);
  if (hidden || mode === 'installed' || mode === 'unavailable') return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Sin almacenamiento: se oculta solo en esta sesión.
    }
    setHidden(true);
  };

  return (
    <section
      className="no-print card relative flex flex-col gap-4 overflow-hidden border-accent/30 bg-gradient-to-r from-accent/15 via-surface to-surface p-4 sm:flex-row sm:items-center sm:p-5"
      aria-label="Instalar la app"
    >
      <BrandMark className="h-12 w-12 text-base" />
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-semibold text-ink">📲 Instala la app de XAC Barber Studio</p>
        <p className="mt-0.5 text-xs text-muted">
          {isClient
            ? 'Reserva tu próximo corte en segundos y revisa tus citas desde tu celular.'
            : 'Ten la agenda, la caja y los avisos de citas a un toque, sin abrir el navegador.'}
        </p>
      </div>
      <InstallActions size="sm" />
      <button onClick={dismiss} className="absolute right-3 top-3 text-subtle hover:text-ink" aria-label="Ahora no">
        <X className="h-4 w-4" />
      </button>
    </section>
  );
};
