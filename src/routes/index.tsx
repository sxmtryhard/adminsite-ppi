import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPlaceholder } from '@/pages/dashboard/DashboardPlaceholder';
import { ClientsPage } from '@/pages/clients/ClientsPage';
import { ServicesPage } from '@/pages/services/ServicesPage';
import { BarbersPage } from '@/pages/barbers/BarbersPage';
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { PosPage } from '@/pages/pos/PosPage';
import { HistoryPage } from '@/pages/history/HistoryPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <DashboardPlaceholder />,
          },
          {
            path: 'citas',
            element: <AppointmentsPage />,
          },
          {
            path: 'ventas',
            element: <PosPage />,
          },
          {
            path: 'caja',
            element: <PosPage />,
          },
          {
            path: 'historial',
            element: <HistoryPage />,
          },
          {
            path: 'reportes',
            element: <ReportsPage />,
          },
          {
            path: 'clientes',
            element: <ClientsPage />,
          },
          {
            path: 'servicios',
            element: <ServicesPage />,
          },
          {
            path: 'barberos',
            element: <BarbersPage />,
          },
          {
            path: 'productos',
            element: <ProductsPage />,
          },
          {
            path: 'configuracion',
            element: <SettingsPage />,
          },
          {
            path: '*',
            element: <Navigate to="/" replace />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);