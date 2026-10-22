import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { authErrorMessage, authService } from '@/services/firebase/auth.service';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Feedback';
import { validateEmail } from '@/domain/validation';
import { AuthShell } from './AuthShell';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateEmail(email);
    setError(invalid);
    if (invalid) return;
    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Recupera tu acceso"
      subtitle="Te enviaremos un enlace para crear una nueva contraseña"
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      {sent ? (
        // Mismo mensaje exista o no la cuenta: no revela qué correos están registrados.
        <Alert tone="success">
          Si existe una cuenta con ese correo, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            Enviar enlace
          </Button>
        </form>
      )}
    </AuthShell>
  );
};
