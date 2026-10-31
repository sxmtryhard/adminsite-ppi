import React, { useState } from 'react';
import { CheckCircle2, Download, Share, SquarePlus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { promptInstall, useInstallMode } from '@/lib/installPrompt';

/** Botón o instrucciones de instalación según el navegador. */
export const InstallActions: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  const mode = useInstallMode();
  const [busy, setBusy] = useState(false);

  if (mode === 'installed') {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> La app ya está instalada en este dispositivo.
      </p>
    );
  }
  if (mode === 'prompt') {
    return (
      <Button
        size={size}
        isLoading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await promptInstall();
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download className="h-4 w-4" aria-hidden /> Instalar app
      </Button>
    );
  }
  if (mode === 'ios') {
    return (
      <ol className="space-y-1.5 text-sm text-muted">
        <li className="flex items-center gap-2">
          <span className="text-ink">1.</span> Toca <Share className="h-4 w-4 text-accent" aria-label="Compartir" /> <span className="text-ink">Compartir</span> en Safari.
        </li>
        <li className="flex items-center gap-2">
          <span className="text-ink">2.</span> Elige <SquarePlus className="h-4 w-4 text-accent" aria-hidden />
          <span className="text-ink">Agregar a pantalla de inicio</span>.
        </li>
      </ol>
    );
  }
  return (
    <p className="text-sm text-muted">
      Abre este enlace en <span className="text-ink">Chrome</span> (Android o computador) o en <span className="text-ink">Safari</span> (iPhone) para instalarla.
    </p>
  );
};
