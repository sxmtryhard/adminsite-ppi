export type UserRole = 'admin' | 'barber' | 'client';

/** Documento `users/{uid}`. El rol solo lo puede asignar un administrador (ver firestore.rules). */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone: string;
  /** Barbero vinculado (solo rol barber). */
  barberId: string | null;
  active: boolean;
  emailVerified: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  barber: 'Barbero',
  client: 'Cliente',
};

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/',
  barber: '/barbero',
  client: '/portal',
};
