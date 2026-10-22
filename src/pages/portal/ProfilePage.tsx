import React, { useState } from 'react';
import { KeyRound, UserCircle } from 'lucide-react';
import { Card, PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Textarea } from '@/components/common/Input';
import { Alert, Spinner } from '@/components/common/Feedback';
import { VerifyEmailBanner } from '@/components/common/VerifyEmailBanner';
import { useAsync } from '@/hooks/useAsync';
import { useAuth, useSession } from '@/context/auth-context';
import { clientsService } from '@/services/firebase/clients.service';
import { usersService } from '@/services/firebase/users.service';
import { authService } from '@/services/firebase/auth.service';
import { toUserMessage } from '@/services/firebase/helpers';
import { hasErrors, validateName, validatePhone, type FieldErrors } from '@/domain/validation';

export const ProfilePage: React.FC = () => {
  const { user } = useSession();
  const { refreshProfile } = useAuth();
  const client = useAsync(() => clientsService.getClient(user.uid), [user.uid]);
  const [draft, setDraft] = useState<{ fullName: string; phone: string; notes: string } | null>(null);
  const [errors, setErrors] = useState<FieldErrors<'fullName' | 'phone'>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  if (client.loading) return <Spinner />;
  const form = draft ?? { fullName: client.data?.fullName ?? user.displayName, phone: client.data?.phone ?? user.phone, notes: client.data?.notes ?? '' };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = { fullName: validateName(form.fullName), phone: validatePhone(form.phone) };
    setErrors(next);
    if (hasErrors(next)) return;
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all([usersService.updateOwnProfile(user.uid, form.fullName, form.phone), clientsService.updateClient(user.uid, form)]);
      await refreshProfile();
      setDraft(null);
      client.reload();
      setMessage({ tone: 'success', text: 'Perfil actualizado.' });
    } catch (err) {
      setMessage({ tone: 'error', text: toUserMessage(err, 'No fue posible guardar.') });
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    try {
      await authService.requestPasswordReset(user.email);
      setMessage({ tone: 'success', text: 'Te enviamos un enlace para cambiar tu contraseña.' });
    } catch (err) {
      setMessage({ tone: 'error', text: toUserMessage(err) });
    }
  };

  return (
    <>
      <PageHeader title="Mi perfil" description="Datos de contacto y preferencias para tus citas." />
      <VerifyEmailBanner />
      {client.error && <Alert>{client.error}</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Datos personales" icon={UserCircle} className="lg:col-span-2">
          <form onSubmit={save} className="space-y-4" noValidate>
            <Input label="Correo" value={user.email} disabled hint="El correo es tu usuario de acceso." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre completo" value={form.fullName} onChange={(e) => setDraft({ ...form, fullName: e.target.value })} error={errors.fullName} />
              <Input label="Celular" type="tel" value={form.phone} onChange={(e) => setDraft({ ...form, phone: e.target.value })} error={errors.phone} />
            </div>
            <Textarea
              label="Preferencias"
              placeholder="Ej.: corte bajo a los lados, sin máquina en la nuca…"
              maxLength={300}
              value={form.notes}
              onChange={(e) => setDraft({ ...form, notes: e.target.value })}
            />
            {message && <Alert tone={message.tone}>{message.text}</Alert>}
            <div className="flex justify-end">
              <Button type="submit" isLoading={saving} disabled={!draft}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </Card>
        <Card title="Seguridad" icon={KeyRound}>
          <p className="text-sm text-muted">Para cambiar tu contraseña te enviaremos un enlace seguro a tu correo.</p>
          <Button className="mt-4" variant="outline" onClick={resetPassword}>
            Cambiar contraseña
          </Button>
        </Card>
      </div>
    </>
  );
};
