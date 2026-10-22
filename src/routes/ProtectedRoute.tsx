import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, UserX } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { ROLE_HOME, type UserRole } from '@/types/auth.types';
import { FullScreenLoader } from '@/components/common/Feedback';
import { Button } from '@/components/common/Button';

const BlockedScreen: React.FC<{ title: string; message: string; icon: typeof ShieldAlert }> = ({ title, message, icon: Icon }) => {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="card max-w-md p-8 text-center">
        <Icon className="mx-auto mb-3 h-8 w-8 text-warning" aria-hidden />
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <Button className="mt-6" variant="outline" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
};

/** Exige sesión y un perfil activo con rol válido. */
export const ProtectedRoute: React.FC = () => {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'signed_out') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (status === 'error') {
    return (
      <BlockedScreen
        icon={ShieldAlert}
        title="No fue posible verificar tu cuenta"
        message="Revisa tu conexión y vuelve a intentarlo."
      />
    );
  }
  if (status === 'no_profile' || !user) {
    return (
      <BlockedScreen
        icon={UserX}
        title="Cuenta sin perfil asignado"
        message="Tu cuenta existe, pero no tiene un rol en ADMINSITE. Pide al administrador que la configure."
      />
    );
  }
  if (!user.active) {
    return <BlockedScreen icon={UserX} title="Cuenta desactivada" message="Comunícate con el administrador del estudio." />;
  }
  return <Outlet />;
};

/** Restringe una sección a ciertos roles; los demás vuelven a su inicio. */
export const RoleRoute: React.FC<{ roles: UserRole[] }> = ({ roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
};

/** Páginas públicas (login/registro): si ya hay sesión válida, envía al inicio del rol. */
export const PublicOnlyRoute: React.FC = () => {
  const { status, user, sessionEmail } = useAuth();
  // Solo en la carga inicial: durante un registro en curso el formulario debe seguir montado.
  if (status === 'loading' && !sessionEmail) return <FullScreenLoader />;
  if (status === 'ready' && user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
};
