import { collection, doc, getDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase.config';
import { addAudit, str, strOrNull, type Actor } from './helpers';
import type { UserProfile, UserRole } from '@/types/auth.types';
import { cleanText, normalizePhone } from '@/domain/validation';

const ROLES: UserRole[] = ['admin', 'barber', 'client'];

const toProfile = (uid: string, data: Record<string, unknown>, emailVerified: boolean): UserProfile | null => {
  const role = data.role as UserRole;
  // Sin rol válido no hay acceso: nunca se asume administrador por defecto.
  if (!ROLES.includes(role)) return null;
  return {
    uid,
    email: str(data.email),
    displayName: str(data.displayName, 'Usuario'),
    role,
    phone: str(data.phone),
    barberId: strOrNull(data.barberId),
    active: data.active === true,
    emailVerified,
  };
};

export const usersService = {
  async getProfile(uid: string, emailVerified: boolean): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? toProfile(uid, snap.data(), emailVerified) : null;
  },

  async listUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs
      .map((d) => toProfile(d.id, d.data(), false))
      .filter((u): u is UserProfile => u !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  async updateOwnProfile(uid: string, displayName: string, phone: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
      displayName: cleanText(displayName, 80),
      phone: normalizePhone(phone),
    });
  },

  async setRole(target: UserProfile, role: UserRole, barberId: string | null, actor: Actor): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', target.uid), { role, barberId: role === 'barber' ? barberId : null });
    if (role === 'barber' && barberId) batch.update(doc(db, 'barbers', barberId), { userId: target.uid });
    if (target.role === 'barber' && target.barberId && target.barberId !== barberId) {
      batch.update(doc(db, 'barbers', target.barberId), { userId: null });
    }
    addAudit(batch, actor, 'user.role_changed', 'users', target.uid, { from: target.role, to: role });
    await batch.commit();
  },

  async setActive(target: UserProfile, active: boolean, actor: Actor): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', target.uid), { active });
    addAudit(batch, actor, 'user.status_changed', 'users', target.uid, { active });
    await batch.commit();
  },
};
