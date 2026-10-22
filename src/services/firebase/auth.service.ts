import { FirebaseError, deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase.config';
import { addAudit, AppError, type Actor } from './helpers';
import { cleanText, normalizePhone } from '@/domain/validation';

const AUTH_MESSAGES: Record<string, string> = {
  // Mensaje único para credenciales: evita revelar si el correo existe.
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
  'auth/email-already-in-use': 'No fue posible crear la cuenta con ese correo. Si ya tienes una, inicia sesión o recupera tu contraseña.',
  'auth/weak-password': 'La contraseña es demasiado débil.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
  'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión.',
};

export const authErrorMessage = (err: unknown): string => {
  if (err instanceof AppError) return err.message;
  if (err instanceof FirebaseError) return AUTH_MESSAGES[err.code] ?? 'No fue posible completar la operación.';
  return 'No fue posible completar la operación.';
};

export interface RegisterClientInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const verificationSettings = () => ({ url: `${window.location.origin}/login?verificado=1` });

export const authService = {
  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  },

  /**
   * Registro público. Siempre crea el rol `client` (las reglas rechazan cualquier otro)
   * y envía el correo de verificación de Firebase Authentication.
   */
  async registerClient(input: RegisterClientInput): Promise<void> {
    const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    const user = credential.user;
    const fullName = cleanText(input.fullName, 80);
    const phone = normalizePhone(input.phone);
    try {
      await updateProfile(user, { displayName: fullName });
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: fullName,
        role: 'client',
        phone,
        barberId: null,
        active: true,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'clients', user.uid), {
        fullName,
        email: user.email,
        phone,
        notes: '',
        status: 'active',
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      await sendEmailVerification(user, verificationSettings());
    } catch (err) {
      // Sin perfil la cuenta quedaría inutilizable: se elimina para permitir reintentar.
      await user.delete().catch(() => undefined);
      throw err;
    }
  },

  async resendVerification(): Promise<void> {
    if (!auth.currentUser) throw new AppError('no-session', 'Inicia sesión de nuevo.');
    await sendEmailVerification(auth.currentUser, verificationSettings());
  },

  /** Recarga el usuario para conocer si ya verificó el correo; refresca el token para las reglas. */
  async refreshVerification(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    await reload(user);
    if (user.emailVerified) await user.getIdToken(true);
    return user.emailVerified;
  },

  /** Siempre resuelve igual exista o no la cuenta (evita enumeración). */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim(), { url: `${window.location.origin}/login` });
    } catch (err) {
      if (err instanceof FirebaseError && ['auth/user-not-found', 'auth/invalid-email'].includes(err.code)) return;
      throw err;
    }
  },

  /**
   * Alta de personal por el administrador. Se usa una instancia secundaria de Firebase
   * para no cerrar la sesión del administrador. La contraseña es aleatoria y nunca se muestra:
   * el barbero define la suya con el enlace de restablecimiento que recibe por correo.
   */
  async createStaffAccount(
    input: { email: string; displayName: string; role: 'admin' | 'barber'; barberId: string | null },
    actor: Actor
  ): Promise<string> {
    const secondary = initializeApp(firebaseConfig, `staff-${Date.now()}`);
    const secondaryAuth = getAuth(secondary);
    try {
      const randomPassword = `${crypto.randomUUID()}Aa1!`;
      const credential = await createUserWithEmailAndPassword(secondaryAuth, input.email.trim(), randomPassword);
      const uid = credential.user.uid;
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), {
        email: credential.user.email,
        displayName: cleanText(input.displayName, 80),
        role: input.role,
        phone: '',
        barberId: input.barberId,
        active: true,
        createdAt: serverTimestamp(),
      });
      if (input.barberId) batch.update(doc(db, 'barbers', input.barberId), { userId: uid });
      addAudit(batch, actor, 'staff.created', 'users', uid, { role: input.role, barberId: input.barberId });
      try {
        await batch.commit();
      } catch (err) {
        await credential.user.delete().catch(() => undefined);
        throw err;
      }
      await sendPasswordResetEmail(secondaryAuth, input.email.trim(), { url: `${window.location.origin}/login` });
      await signOut(secondaryAuth);
      return uid;
    } finally {
      await deleteApp(secondary);
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};
