import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC<{ onOpenMenu: () => void }> = ({ onOpenMenu }) => {
  const { user } = useAuth();
  if (!user) return null;

  const cta =
    user.role === 'admin'
      ? { to: '/citas?nueva=1', label: 'Nueva cita' }
      : user.role === 'client'
        ? { to: '/portal/reservar', label: 'Reservar' }
        : null;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenMenu}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      <p className="hidden text-sm text-muted sm:block">
        Hola, <span className="font-medium text-ink">{user.displayName.split(' ')[0]}</span>
      </p>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell userId={user.uid} isAdmin={user.role === 'admin'} />
        {cta && (
          <Link
            to={cta.to}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-br from-accent to-accent-strong px-4 text-sm font-medium text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {cta.label}
          </Link>
        )}
      </div>
    </header>
  );
};
