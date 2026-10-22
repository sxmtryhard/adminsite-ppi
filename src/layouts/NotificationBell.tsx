import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { notificationsService } from '@/services/firebase/notifications.service';
import type { AppNotification } from '@/types/notification.types';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export const NotificationBell: React.FC<{ userId: string }> = ({ userId }) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(
    () =>
      notificationsService.subscribe(
        userId,
        (list) => {
          setItems(list);
          setError(false);
        },
        () => setError(true)
      ),
    [userId]
  );

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
    if (!n.read) await notificationsService.markRead(n.id).catch(() => undefined);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await Promise.all(items.filter((n) => !n.read).map((n) => notificationsService.markRead(n.id))).catch(() => undefined);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label={unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notificaciones</p>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                <Check className="h-3 w-3" /> Marcar todas
              </button>
            )}
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
    </div>
  );
};
