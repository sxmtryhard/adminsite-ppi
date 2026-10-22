import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { authService } from '@/services/firebase/auth.service';
import { usersService } from '@/services/firebase/users.service';
import { auth } from '@/services/firebase/firebase.config';
import type { UserProfile } from '@/types/auth.types';
import { AuthContext, type AuthStatus } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Solo la carga más reciente actualiza el estado (evita carreras durante el registro).
  const requestSeq = useRef(0);

  const loadProfile = useCallback(async (fbUser: FirebaseUser) => {
    const seq = ++requestSeq.current;
    try {
      const profile = await usersService.getProfile(fbUser.uid, fbUser.emailVerified);
      if (seq !== requestSeq.current) return;
      setUser(profile);
      setStatus(profile ? 'ready' : 'no_profile');
    } catch {
      if (seq !== requestSeq.current) return;
      setUser(null);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        requestSeq.current++;
        setUser(null);
        setStatus('signed_out');
        return;
      }
      setStatus('loading');
      void loadProfile(fbUser);
    });
    return unsubscribe;
  }, [loadProfile]);

  // Usa auth.currentUser (no el estado) para servir justo después de registrarse o verificar.
  const refreshProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    await authService.refreshVerification();
    await loadProfile(current);
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      sessionEmail: firebaseUser?.email ?? null,
      actor: user ? { uid: user.uid, name: user.displayName } : null,
      refreshProfile,
      logout,
    }),
    [status, user, firebaseUser, refreshProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
