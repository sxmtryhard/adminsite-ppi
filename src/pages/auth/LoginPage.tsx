import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { authErrorMessage, authService } from '@/services/firebase/auth.service';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Feedback';
import { AuthShell } from './AuthShell';

// Freno de interfaz tras varios fallos seguidos. La protección real contra fuerza bruta
// la aplica Firebase Authentication (auth/too-many-requests).
const MAX_FAILS = 5;
const COOLDOWN_MS = 30_000;

export const LoginPage: React.FC = () => {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < blockedUntil) {
      setErrorMessage('Demasiados intentos. Espera unos segundos.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // La redirección por rol la hace PublicOnlyRoute cuando el perfil termina de cargar.
      await authService.login(email, password);
      setFails(0);
    } catch (err) {
      const next = fails + 1;
      setFails(next);
      if (next >= MAX_FAILS) {
        setBlockedUntil(Date.now() + COOLDOWN_MS);
        setFails(0);
      }
      setErrorMessage(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Ingresa a tu cuenta para continuar"
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-accent hover:underline">
            Regístrate como cliente
          </Link>
        </>
      }
    >
      {params.get('verificado') && (
        <Alert tone="success" className="mb-4">
          Si completaste la verificación, inicia sesión para continuar.
        </Alert>
      )}
      {errorMessage && <Alert className="mb-4">{errorMessage}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="flex justify-end">
          <Link to="/recuperar" className="text-xs text-muted hover:text-ink">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" className="w-full" isLoading={loading} disabled={!email || !password}>
          Iniciar sesión
        </Button>
      </form>
    </AuthShell>
  );
};
