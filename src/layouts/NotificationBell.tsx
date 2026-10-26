import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellRing, Check, Volume2, VolumeX, X } from 'lucide-react';
import { notificationsService } from '@/services/firebase/notifications.service';
import type { AppNotification } from '@/types/notification.types';
import { formatDateTime } from '@/lib/format';
import { isMuted, playChime, setMuted } from '@/lib/notificationSound';
import { cn } from '@/lib/utils';

const TOAST_MS = 7000;
/** Margen para diferencias de reloj entre el servidor y el navegador. */
const CLOCK_TOLERANCE_MS = 30_000;

export const NotificationBell: React.FC<{ userId: string; isAdmin: boolean }> = ({ userId, isAdmin }) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [muted, setMutedState] = useState(isMuted);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Solo suenan los avisos que llegan con la app abierta, nunca los antiguos al iniciar sesión.
  const announced = useRef(new Set<string>());

  useEffect(() => {
    const since = Date.now() - CLOCK_TOLERANCE_MS;
    return notificationsService.subscribe(
        userId,
        isAdmin,
        (list) => {
          setItems(list);
          setError(false);
          const fresh = list.filter(
            (n) =>
              !n.read &&
              !announced.current.has(n.id) &&
              new Date(n.createdAt).getTime() >= since
          );
          list.forEach((n) => announced.current.add(n.id));
          if (fresh.length > 0) {
            playChime();
            setToasts((prev) => [...fresh, ...prev].slice(0, 3));
          }
        },
        () => setError(true)
      );
  }, [userId, isAdmin]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(0, -1)), TOAST_MS);
    return () => clearTimeout(t);
  }, [toasts]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  const openItem = async (n: AppNotification) => {
    setToasts((prev) => prev.filter((t) => t.id !== n.id));
    if (!n.read) await notificationsService.markRead(n.id).catch(() => undefined);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await Promise.all(items.filter((n) => !n.read).map((n) => notificationsService.markRead(n.id))).catch(() => undefined);
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
    if (muted) playChime();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label={unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
        aria-expanded={open}
      >
        <Bell className={cn('h-4 w-4', toasts.length > 0 && 'animate-[wiggle_0.6s_ease-in-out_2] text-accent')} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notificaciones</p>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                aria-pressed={!muted}
                title={muted ? 'Activar sonido' : 'Silenciar'}
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {muted ? 'Sin sonido' : 'Sonido'}
              </button>
              {unread > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                  <Check className="h-3 w-3" /> Marcar todas
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {error ? (
              <p className="px-4 py-6 text-center text-sm text-danger">No fue posible cargar las notificaciones.</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">No tienes notificaciones.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={cn('block w-full border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-surface-2', !n.read && 'bg-accent/5')}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Sin leer" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                      <p className="mt-1 text-[11px] text-subtle">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Avisos emergentes de notificaciones nuevas */}
      <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-accent/40 bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              role="status"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                <BellRing className="h-4 w-4" aria-hidden />
              </div>
              <button className="min-w-0 flex-1 text-left" onClick={() => openItem(n)}>
                <p className="text-sm font-semibold text-ink">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted">{n.body}</p>
              </button>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== n.id))}
                className="text-subtle hover:text-ink"
                aria-label="Cerrar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
