import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authErrorMessage, authService } from '@/services/firebase/auth.service';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Feedback';
import { hasErrors, validateEmail, validateName, validatePassword, validatePhone, type FieldErrors } from '@/domain/validation';
import { AuthShell } from './AuthShell';

type Field = 'fullName' | 'email' | 'phone' | 'password' | 'confirm';

export const RegisterPage: React.FC = () => {
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors<Field> = {
      fullName: validateName(form.fullName),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone),
      password: validatePassword(form.password),
      confirm: form.password !== form.confirm ? 'Las contraseñas no coinciden.' : undefined,
    };
    setErrors(next);
    if (hasErrors(next)) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      await authService.registerClient(form);
      // Con el perfil cargado, PublicOnlyRoute lleva al portal, que pide verificar el correo.
      await refreshProfile();
    } catch (err) {
      setErrorMessage(authErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Reserva tus citas en XAC Barber Studio"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      {errorMessage && <Alert className="mb-4">{errorMessage}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Nombre completo" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Input label="Correo electrónico" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Celular" type="tel" autoComplete="tel" placeholder="3001234567" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="Mínimo 8 caracteres, con letras y números."
        />
        <Input label="Confirmar contraseña" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <p className="text-xs text-subtle">Te enviaremos un enlace para verificar tu correo antes de tu primera reserva.</p>
        <Button type="submit" className="w-full" isLoading={loading}>
          Crear cuenta
        </Button>
      </form>
    </AuthShell>
  );
};
