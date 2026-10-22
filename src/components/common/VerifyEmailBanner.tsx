import React, { useEffect, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { authErrorMessage, authService } from '@/services/firebase/auth.service';
import { Button } from './Button';

const RESEND_COOLDOWN_S = 60;

/** Aviso para clientes sin correo verificado. Las reglas impiden reservar hasta verificar. */
export const VerifyEmailBanner: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!user || user.emailVerified) return null;

  const resend = async () => {
    setMessage(null);
    try {
      await authService.resendVerification();
      setCooldown(RESEND_COOLDOWN_S);
      setMessage('Enlace enviado. Revisa tu bandeja de entrada y spam.');
    } catch (err) {
      setMessage(authErrorMessage(err));
    }
  };

  const check = async () => {
    setChecking(true);
    setMessage(null);
    await refreshProfile();
    setChecking(false);
    setMessage('Si ya abriste el enlace, tu cuenta quedará verificada en unos segundos.');
  };

  return (
    <div className="card flex flex-col gap-3 border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center" role="status">
      <MailCheck className="h-5 w-5 shrink-0 text-warning" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium text-ink">Verifica tu correo para poder reservar</p>
        <p className="text-muted">
          Enviamos un enlace a <span className="text-ink">{user.email}</span>. {message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar'}
        </Button>
        <Button size="sm" onClick={check} isLoading={checking}>
          Ya verifiqué
        </Button>
      </div>
    </div>
  );
};
