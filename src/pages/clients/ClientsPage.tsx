import React, { useMemo, useState } from 'react';
import { History, Pencil, Plus, Search, Users2 } from 'lucide-react';
import { PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input, Textarea } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Alert, EmptyState, SkeletonRows, Spinner } from '@/components/common/Feedback';
import { ActiveBadge, Badge, StatusBadge } from '@/components/common/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { clientsService } from '@/services/firebase/clients.service';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { salesService } from '@/services/firebase/sales.service';
import { toUserMessage } from '@/services/firebase/helpers';
import { hasErrors, validateEmail, validateName, validatePhone, type FieldErrors } from '@/domain/validation';
import { formatCOP, formatDateTime } from '@/lib/format';
import type { Client } from '@/types/client.types';

const PAGE_SIZE = 20;
type Field = 'fullName' | 'email' | 'phone';

const ClientHistory: React.FC<{ client: Client }> = ({ client }) => {
  const history = useAsync(
    () => Promise.all([appointmentsService.listForClient(client.id), salesService.listForClient(client.id)]),
    [client.id]
  );
  if (history.loading) return <Spinner />;
  if (history.error) return <Alert>{history.error}</Alert>;
  const [appts, sales] = history.data ?? [[], []];
  const paid = sales.filter((s) => s.status === 'paid');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-lg font-semibold text-ink">{appts.length}</p>
          <p className="text-xs text-muted">Citas</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-lg font-semibold text-ink">{appts.filter((a) => a.status === 'completed').length}</p>
          <p className="text-xs text-muted">Atendidas</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-lg font-semibold text-ink">{formatCOP(paid.reduce((s, x) => s + x.total, 0))}</p>
          <p className="text-xs text-muted">Pagado</p>
        </div>
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {[...appts].reverse().map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
            <div>
              <p className="text-ink">{a.serviceName} · {a.barberName}</p>
              <p className="text-xs text-subtle">{a.date} {a.time}</p>
            </div>
            <StatusBadge status={a.status} />
          </div>
        ))}
        {paid.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
            <div>
              <p className="text-ink">{s.items.map((i) => i.name).join(', ')}</p>
              <p className="text-xs text-subtle">{formatDateTime(s.createdAt)}</p>
            </div>
            <span className="font-medium text-ink">{formatCOP(s.total)}</span>
          </div>
        ))}
        {appts.length === 0 && paid.length === 0 && <p className="py-6 text-center text-sm text-muted">Sin historial.</p>}
      </div>
    </div>
  );
};

export const ClientsPage: React.FC = () => {
  const clients = useAsync(() => clientsService.getClients(), []);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', notes: '' });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (clients.data ?? []).filter(
      (c) => !q || c.fullName.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [clients.data, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openForm = (client: Client | 'new') => {
    setEditing(client);
    setErrors({});
    setError(null);
    setForm(client === 'new' ? { fullName: '', email: '', phone: '', notes: '' } : { fullName: client.fullName, email: client.email, phone: client.phone, notes: client.notes });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors<Field> = {
      fullName: validateName(form.fullName),
      phone: validatePhone(form.phone),
      email: form.email ? validateEmail(form.email) : undefined,
    };
    setErrors(next);
    if (hasErrors(next) || !editing) return;
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') await clientsService.createClient(form);
      else await clientsService.updateClient(editing.id, form);
      setEditing(null);
      clients.reload();
    } catch (err) {
      setError(toUserMessage(err, 'No fue posible guardar el cliente.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (client: Client) => {
    try {
      await clientsService.setStatus(client.id, client.status === 'active' ? 'inactive' : 'active');
      clients.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Clientes registrados en el portal y de mostrador."
        actions={
          <Button onClick={() => openForm('new')}>
            <Plus className="h-4 w-4" aria-hidden /> Nuevo cliente
          </Button>
        }
      />
      <div className="max-w-sm">
        <Input
          aria-label="Buscar clientes"
          placeholder="Buscar por nombre, teléfono o correo…"
          icon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {(clients.error || (error && !editing)) && <Alert>{clients.error ?? error}</Alert>}

      <div className="card overflow-hidden">
        {clients.loading ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users2} title="No hay clientes" description="Registra clientes de mostrador o invítalos a crear su cuenta en el portal." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[720px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Origen</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium">{c.fullName}</p>
                      {c.notes && <p className="text-xs text-subtle">{c.notes}</p>}
                    </td>
                    <td>
                      {c.phone}
                      <span className="block text-xs text-subtle">{c.email || '—'}</span>
                    </td>
                    <td>{c.userId ? <Badge tone="accent">Portal</Badge> : <Badge>Mostrador</Badge>}</td>
                    <td>
                      <ActiveBadge active={c.status === 'active'} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(c)}>
                          <History className="h-3.5 w-3.5" aria-hidden /> Historial
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openForm(c)} aria-label={`Editar ${c.fullName}`}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                          {c.status === 'active' ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
            <span>
              Página {page} de {pages} · {filtered.length} clientes
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo cliente' : 'Editar cliente'}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input label="Nombre completo *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Teléfono *" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
            <Input
              label="Correo"
              type="email"
              value={form.email}
              disabled={editing !== 'new'}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
          </div>
          <Textarea
            label="Preferencias"
            hint="Visible para el cliente en su perfil. No registres información privada aquí."
            maxLength={300}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={viewing !== null} onClose={() => setViewing(null)} title={viewing?.fullName ?? ''} description="Historial de citas y pagos" size="lg">
        {viewing && <ClientHistory client={viewing} />}
      </Modal>
    </>
  );
};
