import type React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './ProtectedRoute';

/** Carga diferida por ruta: cada rol descarga solo las pantallas que usa. */
const page =
  <M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M & string) =>
  async () => ({ Component: (await loader())[name] as React.ComponentType });

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/registro', element: <RegisterPage /> },
      { path: '/recuperar', element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            element: <RoleRoute roles={['admin']} />,
            children: [
              { index: true, lazy: page(() => import('@/pages/dashboard/DashboardPage'), 'DashboardPage') },
              { path: 'citas', lazy: page(() => import('@/pages/appointments/AppointmentsPage'), 'AppointmentsPage') },
              { path: 'ventas', lazy: page(() => import('@/pages/pos/PosPage'), 'PosPage') },
              { path: 'caja', element: <Navigate to="/ventas" replace /> },
              { path: 'historial', lazy: page(() => import('@/pages/history/HistoryPage'), 'HistoryPage') },
              { path: 'reportes', lazy: page(() => import('@/pages/reports/ReportsPage'), 'ReportsPage') },
              { path: 'clientes', lazy: page(() => import('@/pages/clients/ClientsPage'), 'ClientsPage') },
              { path: 'servicios', lazy: page(() => import('@/pages/services/ServicesPage'), 'ServicesPage') },
              { path: 'barberos', lazy: page(() => import('@/pages/barbers/BarbersPage'), 'BarbersPage') },
              { path: 'productos', lazy: page(() => import('@/pages/products/ProductsPage'), 'ProductsPage') },
              { path: 'gastos', lazy: page(() => import('@/pages/expenses/ExpensesPage'), 'ExpensesPage') },
              { path: 'usuarios', lazy: page(() => import('@/pages/users/UsersPage'), 'UsersPage') },
              { path: 'auditoria', lazy: page(() => import('@/pages/audit/AuditPage'), 'AuditPage') },
              { path: 'configuracion', lazy: page(() => import('@/pages/settings/SettingsPage'), 'SettingsPage') },
            ],
          },
          {
            path: 'barbero',
            element: <RoleRoute roles={['barber']} />,
            children: [
              { index: true, lazy: page(() => import('@/pages/barber/BarberHomePage'), 'BarberHomePage') },
              { path: 'agenda', lazy: page(() => import('@/pages/barber/BarberAgendaPage'), 'BarberAgendaPage') },
              { path: 'disponibilidad', lazy: page(() => import('@/pages/barber/BarberAvailabilityPage'), 'BarberAvailabilityPage') },
            ],
          },
          {
            path: 'portal',
            element: <RoleRoute roles={['client']} />,
            children: [
              { index: true, lazy: page(() => import('@/pages/portal/PortalHomePage'), 'PortalHomePage') },
              { path: 'reservar', lazy: page(() => import('@/pages/portal/BookingPage'), 'BookingPage') },
              { path: 'citas', lazy: page(() => import('@/pages/portal/MyAppointmentsPage'), 'MyAppointmentsPage') },
              { path: 'catalogo', lazy: page(() => import('@/pages/portal/CatalogPage'), 'CatalogPage') },
              { path: 'historial', lazy: page(() => import('@/pages/portal/ClientHistoryPage'), 'ClientHistoryPage') },
              { path: 'perfil', lazy: page(() => import('@/pages/portal/ProfilePage'), 'ProfilePage') },
            ],
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
