import React, { useState } from 'react';
import { Search, ShieldCheck, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Alert, SkeletonRows } from '@/components/common/Feedback';
import { ActiveBadge, Badge } from '@/components/common/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { usersService } from '@/services/firebase/users.service';
import { barbersService } from '@/services/firebase/barbers.service';
import { authErrorMessage, authService } from '@/services/firebase/auth.service';
import { toUserMessage } from '@/services/firebase/helpers';
import { validateEmail, validateName } from '@/domain/validation';
import { ROLE_LABELS, type UserProfile, type UserRole } from '@/types/auth.types';

const ROLE_TONE: Record<UserRole, 'accent' | 'info' | 'neutral'> = { admin: 'accent', barber: 'info', client: 'neutral' };

export const UsersPage: React.FC = () => {
  const { user: me, actor } = useSession();
  const data = useAsync(() => Promise.all([usersService.listUsers(), barbersService.getBarbers()]), []);
  const [users, barbers] = data.data ?? [[], []];
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [roleForm, setRoleForm] = useState<{ role: UserRole; barberId: string }>({ role: 'client', barberId: '' });
  const [pending, setPending] = useState<{ user: UserProfile; role: UserRole; barberId: string | null } | null>(null);
  const [creating, setCreating] = useState(false);
  const [staffForm, setStaffForm] = useState({ email: '', displayName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const visible = users.filter(
    (u) => (roleFilter === 'all' || u.role === roleFilter) && (!q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  );
  const barberName = (id: string | null) => barbers.find((b) => b.id === id)?.fullName;

  const toggleActive = async (u: UserProfile) => {
    setError(null);
    try {
      await usersService.setActive(u, !u.active, actor);
      data.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateEmail(staffForm.email) ?? validateName(staffForm.displayName);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authService.createStaffAccount({ ...staffForm, role: 'admin', barberId: null }, actor);
      setCreating(false);
      setStaffForm({ email: '', displayName: '' });
      setNotice('Administrador creado. Recibirá un correo para definir su contraseña.');
      data.reload();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        description="Solo el administrador asigna roles. El registro público siempre crea clientes."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" aria-hidden /> Nuevo administrador
          </Button>
        }
      />
      <Alert tone="info">
        Para dar acceso a un barbero, usa <strong>Barberos › Acceso</strong>: crea la cuenta y la vincula a su agenda.
      </Alert>
      {(data.error || error) && <Alert>{data.error ?? error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="flex flex-wrap gap-3">
        <div className="w-full max-w-sm">
          <Input aria-label="Buscar usuarios" placeholder="Nombre o correo…" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-44">
          <Select aria-label="Filtrar por rol" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}>
            <option value="all">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {data.loading ? (
          <SkeletonRows />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[720px]">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Vínculo</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.uid}>
                    <td>
                      <p className="font-medium">
                        {u.displayName} {u.uid === me.uid && <span className="text-xs text-subtle">(tú)</span>}
                      </p>
                      <p className="text-xs text-subtle">{u.email}</p>
                    </td>
                    <td>
                      <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="text-sm">{u.role === 'barber' ? barberName(u.barberId) ?? <Badge tone="warning">Sin barbero</Badge> : '—'}</td>
                    <td>
                      <ActiveBadge active={u.active} />
                    </td>
                    <td>
                      {u.uid !== me.uid && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(u);
                              setRoleForm({ role: u.role, barberId: u.barberId ?? '' });
                            }}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Rol
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>
                            {u.active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="Cambiar rol" description={editing?.email}>
        <div className="space-y-4">
          <Select label="Rol" value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value as UserRole })}>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          {roleForm.role === 'barber' && (
            <Select label="Barbero vinculado *" value={roleForm.barberId} onChange={(e) => setRoleForm({ ...roleForm, barberId: e.target.value })}>
              <option value="">Selecciona…</option>
              {barbers
                .filter((b) => !b.userId || b.userId === editing?.uid)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName}
                  </option>
                ))}
            </Select>
          )}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={roleForm.role === 'barber' && !roleForm.barberId}
              onClick={() => {
                if (!editing) return;
                setPending({ user: editing, role: roleForm.role, barberId: roleForm.role === 'barber' ? roleForm.barberId : null });
                setEditing(null);
              }}
            >
              Continuar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={pending !== null}
        tone="default"
        title="Confirmar cambio de rol"
        message={pending ? `${pending.user.displayName} pasará de ${ROLE_LABELS[pending.user.role]} a ${ROLE_LABELS[pending.role]}. El cambio queda registrado en la auditoría.` : ''}
        confirmLabel="Cambiar rol"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          await usersService.setRole(pending.user, pending.role, pending.barberId, actor);
          setPending(null);
          data.reload();
        }}
      />

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Nuevo administrador" description="Tendrá acceso completo al negocio.">
        <form onSubmit={createAdmin} className="space-y-4">
          <Input label="Nombre" value={staffForm.displayName} onChange={(e) => setStaffForm({ ...staffForm, displayName: e.target.value })} />
          <Input label="Correo" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={busy}>
              Crear y enviar enlace
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
