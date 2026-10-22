import { createContext, useContext } from 'react';
import type { UserProfile } from '@/types/auth.types';
import type { Actor } from '@/services/firebase/helpers';

export type AuthStatus = 'loading' | 'signed_out' | 'no_profile' | 'ready' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  /** Perfil con rol leído de Firestore. Solo existe cuando status === 'ready'. */
  user: UserProfile | null;
  /** Correo de la sesión de Firebase (también cuando no hay perfil). */
  sessionEmail: string | null;
  actor: Actor | null;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

/** Para páginas que solo se renderizan con sesión y perfil válidos (protegidas por las rutas). */
export const useSession = (): { user: UserProfile; actor: Actor } => {
  const { user, actor } = useAuth();
  if (!user || !actor) throw new Error('Sesión no disponible');
  return { user, actor };
};
