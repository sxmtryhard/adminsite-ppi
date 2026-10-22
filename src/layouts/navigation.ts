import {
  BadgeDollarSign,
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  History,
  LayoutDashboard,
  Package,
  Receipt,
  Scissors,
  ScissorsLineDashed,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserCircle,
  Users2,
  UserCog,
} from 'lucide-react';
import type { NavItem } from '@/types/navigation.types';
import type { UserRole } from '@/types/auth.types';

export const NAVIGATION: Record<UserRole, { section?: string; items: NavItem[] }[]> = {
  admin: [
    {
      items: [
        { title: 'Dashboard', href: '/', icon: LayoutDashboard },
        { title: 'Agenda', href: '/citas', icon: CalendarCheck2 },
        { title: 'Caja y ventas', href: '/ventas', icon: BadgeDollarSign },
      ],
    },
    {
      section: 'Operación',
      items: [
        { title: 'Clientes', href: '/clientes', icon: Users2 },
        { title: 'Barberos', href: '/barberos', icon: ScissorsLineDashed },
        { title: 'Servicios', href: '/servicios', icon: Scissors },
        { title: 'Inventario', href: '/productos', icon: Package },
      ],
    },
    {
      section: 'Finanzas',
      items: [
        { title: 'Gastos', href: '/gastos', icon: Receipt },
        { title: 'Historial', href: '/historial', icon: History },
        { title: 'Reportes', href: '/reportes', icon: BarChart3 },
      ],
    },
    {
      section: 'Administración',
      items: [
        { title: 'Usuarios y roles', href: '/usuarios', icon: UserCog },
        { title: 'Auditoría', href: '/auditoria', icon: ShieldCheck },
        { title: 'Configuración', href: '/configuracion', icon: Settings },
      ],
    },
  ],
  barber: [
    {
      items: [
        { title: 'Mi día', href: '/barbero', icon: LayoutDashboard },
        { title: 'Mi agenda', href: '/barbero/agenda', icon: CalendarCheck2 },
        { title: 'Disponibilidad', href: '/barbero/disponibilidad', icon: CalendarClock },
      ],
    },
  ],
  client: [
    {
      items: [
        { title: 'Inicio', href: '/portal', icon: LayoutDashboard },
        { title: 'Reservar', href: '/portal/reservar', icon: CalendarPlus },
        { title: 'Mis citas', href: '/portal/citas', icon: ClipboardList },
        { title: 'Catálogo', href: '/portal/catalogo', icon: ShoppingBag },
        { title: 'Historial', href: '/portal/historial', icon: History },
        { title: 'Mi perfil', href: '/portal/perfil', icon: UserCircle },
      ],
    },
  ],
};
