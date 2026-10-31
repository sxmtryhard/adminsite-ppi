import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';
import { useAuth } from '@/context/auth-context';
import { ROLE_LABELS } from '@/types/auth.types';
import { NAVIGATION } from './navigation';
import { BrandMark } from '@/components/common/BrandMark';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  if (!user) return null;
  const groups = NAVIGATION[user.role];
  const compact = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onCloseMobile} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-[#111318] transition-all duration-300 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          compact ? 'w-[72px]' : 'w-64'
        )}
        aria-label="Navegación principal"
      >
        <div className="flex h-16 items-center justify-between px-4">
          {!compact && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <BrandMark className="h-8 w-8 text-xs" />
              <div className="leading-tight">
                <p className="truncate text-sm font-semibold text-ink">XAC Studio</p>
                <p className="text-[11px] text-subtle">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapsed}
            className={cn('hidden h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink lg:flex', compact && 'mx-auto')}
            aria-label={compact ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', compact && 'rotate-180')} />
          </button>
          <button
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-1">
              {group.section && !compact && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-subtle">{group.section}</p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === '/' || item.href === '/barbero' || item.href === '/portal'}
                    onClick={onCloseMobile}
                    title={compact ? item.title : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors',
                        compact && 'justify-center',
                        isActive
                          ? 'bg-gradient-to-br from-accent to-accent-strong font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.35)]'
                          : 'text-muted hover:bg-surface-2 hover:text-ink'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!compact && <span className="truncate">{item.title}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className={cn('flex items-center gap-3', compact && 'flex-col')}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-medium text-ink">
              {initials(user.displayName)}
            </div>
            {!compact && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{user.displayName}</p>
                <p className="truncate text-[11px] text-subtle">{user.email}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
