import React, { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/common/Button';

/** Con la app abierta todo el día (caja, agenda) también se buscan versiones nuevas cada 30 min. */
const UPDATE_CHECK_MS = 30 * 60 * 1000;

const useOnline = () => {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
};

/** Aviso de versión nueva (tras cada despliegue) y de falta de conexión. */
export const AppUpdatePrompt: React.FC = () => {
  const online = useOnline();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update().catch(() => undefined), UPDATE_CHECK_MS);
    },
  });

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {!online && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-warning/40 bg-surface px-4 py-2 text-xs text-warning shadow-lg" role="status">
          <WifiOff className="h-3.5 w-3.5" aria-hidden /> Sin conexión: los cambios no se guardarán hasta que vuelva la red.
        </div>
      )}
      {needRefresh && (
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-accent/40 bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.55)]" role="status">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
            <RefreshCw className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Hay una versión nueva</p>
            <p className="text-xs text-muted">Actualiza para usar las últimas mejoras.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
            Luego
          </Button>
          <Button size="sm" onClick={() => void updateServiceWorker(true)}>
            Actualizar
          </Button>
        </div>
      )}
    </div>
  );
};
