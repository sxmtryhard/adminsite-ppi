import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck2,
  Users2,
  Scissors,
  Package,
  BadgeDollarSign,
  History,
  BarChart3,
  Settings,
  ChevronLeft,
  ScissorsLineDashed,
} from 'lucide-react';
import { NavItem } from '@/types/navigation.types';
import { cn } from '@/lib/utils';

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Citas', href: '/citas', icon: CalendarCheck2, badge: '4' },
  { title: 'Clientes', href: '/clientes', icon: Users2 },
  { title: 'Barberos', href: '/barberos', icon: ScissorsLineDashed },
  { title: 'Servicios', href: '/servicios', icon: Scissors },
  { title: 'Productos', href: '/productos', icon: Package },
  { title: 'Caja & Ventas', href: '/ventas', icon: BadgeDollarSign },
  { title: 'Historial', href: '/historial', icon: History },
  { title: 'Reportes', href: '/reportes', icon: BarChart3 },
  { title: 'Configuración', href: '/configuracion', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border bg-neutral-950/80 backdrop-blur-md transition-all duration-300 ease-in-out select-none shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-14 items-center justify-between px-3 border-b border-border/50">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 overflow-hidden">
            <div className="h-6 w-6 rounded bg-neutral-100 flex items-center justify-center text-neutral-950 font-bold text-xs tracking-wider">
              X
            </div>
            <span className="text-sm font-semibold tracking-tight text-neutral-200 truncate">
              XAC Studio
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200 transition-colors',
            collapsed && 'mx-auto'
          )}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-neutral-800/80 text-neutral-100 font-semibold'
                    : 'text-neutral-400 hover:bg-neutral-900/50 hover:text-neutral-200'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-neutral-800 px-1.5 py-0.2 text-[10px] font-mono text-neutral-300 border border-neutral-700">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 border-t border-border/50">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="h-7 w-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300 shrink-0">
            SC
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-medium text-neutral-200 truncate">Samuel Correa</span>
              <span className="text-[10px] text-neutral-500 font-mono">Administrador</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};