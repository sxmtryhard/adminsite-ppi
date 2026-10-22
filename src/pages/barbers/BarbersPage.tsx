import React, { useState } from 'react';
import { CalendarClock, KeyRound, Plus, ScissorsLineDashed, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Alert, EmptyState, SkeletonRows, Spinner } from '@/components/common/Feedback';
import { ActiveBadge, Badge } from '@/components/common/StatusBadge';
import { ScheduleEditor } from '@/components/barbers/ScheduleEditor';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { barbersService, DEFAULT_SCHEDULE } from '@/services/firebase/barbers.service';
import { authErrorMessage, authService } from '@/services/firebase/auth.service';
import { toUserMessage } from '@/services/firebase/helpers';
import { hasErrors, validateEmail, validateName, validatePhone, type FieldErrors } from '@/domain/validation';
import { WEEKDAY_LABELS } from '@/domain/time';
import { hasWorkingDays } from '@/domain/availability';
import type { Barber, BarberPrivate } from '@/types/barber.types';

const scheduleSummary = (b: Barber) => {
  const days = Object.entries(b.schedule).filter(([, d]) => d).map(([k]) => WEEKDAY_LABELS[Number(k)].slice(0, 3));
  return days.length ? days.join(' · ') : 'Sin horario configurado';
};

const PrivateForm: React.FC<{ barber: Barber; onDone: () => void }> = ({ barber, onDone }) => {
  const { actor } = useSession();
  const current = useAsync(() => barbersService.getPrivate(barber.id), [barber.id]);
  const [form, setForm] = useState<{ phone: string; rate: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (current.loading) return <Spinner />;
  if (current.error || !current.data) return <Alert>{current.error ?? 'Sin datos.'}</Alert>;
  const previous: BarberPrivate = current.data;
  const value = form ?? { phone: previous.phone, rate: previous.commissionRate === null ? '' : String(previous.commissionRate) };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = value.rate.trim() === '' ? null : Number(value.rate);
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
      setError('La comisión debe estar entre 0 y 100, o vacía si no hay política.');
      return;
    }
    if (value.phone && validatePhone(value.phone)) {
      setError(validatePhone(value.phone) ?? null);
      return;
    }
    setSaving(true);
    try {
      await barbersService.updatePrivate(barber.id, { phone: value.phone, commissionRate: rate }, previous, actor);
      onDone();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Input label="Teléfono (privado)" type="tel" value={value.phone} onChange={(e) => setForm({ ...value, phone: e.target.value })} />
      <Input
        label="Comisión sobre servicios (%)"
        type="number"
        min={0}
        max={100}
        step="0.5"
        placeholder="Sin política de comisiones"
        value={value.rate}
        onChange={(e) => setForm({ ...value, rate: e.target.value })}
        hint="Déjalo vacío si el negocio no ha definido una política. Solo el administrador y el propio barbero lo ven."
      />
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" isLoading={saving}>
          Guardar
        </Button>
      </div>
    </form>
  );
};

const AccessForm: React.FC<{ barber: Barber; onDone: () => void }> = ({ barber, onDone }) => {
  const { actor } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateEmail(email);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authService.createStaffAccount({ email, displayName: barber.fullName, role: 'barber', barberId: barber.id }, actor);
      onDone();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">
        Se creará una cuenta con rol <strong className="text-ink">Barbero</strong> vinculada a {barber.fullName}. Recibirá un correo para definir su
        contraseña; nadie más la conoce.
      </p>
      <Input label="Correo del barbero" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" isLoading={saving}>
          Crear acceso
        </Button>
      </div>
    </form>
  );
};

type Panel = { kind: 'schedule' | 'private' | 'access'; barber: Barber } | { kind: 'new' } | null;

export const BarbersPage: React.FC = () => {
  const barbers = useAsync(() => barbersService.getBarbers(), []);
  const [panel, setPanel] = useState<Panel>(null);
  const [form, setForm] = useState({ fullName: '', specialty: '', phone: '' });
  const [errors, setErrors] = useState<FieldErrors<'fullName' | 'phone'>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => setPanel(null);
  const done = () => {
    close();
    barbers.reload();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = { fullName: validateName(form.fullName), phone: form.phone ? validatePhone(form.phone) : undefined };
    setErrors(next);
    if (hasErrors(next)) return;
    setSaving(true);
    setError(null);
    try {
      await barbersService.createBarber(
        { fullName: form.fullName, specialty: form.specialty || 'Barbero', status: 'active', schedule: DEFAULT_SCHEDULE, blockedDates: [] },
        form.phone
      );
      setForm({ fullName: '', specialty: '', phone: '' });
      done();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (b: Barber) => {
    try {
      await barbersService.updateBarberStatus(b.id, b.status === 'active' ? 'inactive' : 'active');
      barbers.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Barberos"
        description="Equipo, horarios, ausencias, comisiones y accesos."
        actions={
          <Button onClick={() => setPanel({ kind: 'new' })}>
            <Plus className="h-4 w-4" aria-hidden /> Nuevo barbero
          </Button>
        }
      />
      {(barbers.error || (error && !panel)) && <Alert>{barbers.error ?? error}</Alert>}

      {barbers.loading ? (
        <div className="card">
          <SkeletonRows />
        </div>
      ) : (barbers.data ?? []).length === 0 ? (
        <div className="card">
          <EmptyState icon={ScissorsLineDashed} title="Aún no hay barberos" description="Agrega al equipo para habilitar las reservas." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(barbers.data ?? []).map((b) => (
            <article key={b.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-ink">{b.fullName}</h2>
                  <p className="text-sm text-muted">{b.specialty}</p>
                </div>
                <ActiveBadge active={b.status === 'active'} />
              </div>
              {hasWorkingDays(b.schedule) ? (
                <p className="mt-3 text-xs text-subtle">{scheduleSummary(b)}</p>
              ) : (
                <p className="mt-3 text-xs text-warning">Sin horario configurado: los clientes no verán horas disponibles.</p>
              )}
              <div className="mt-2">{b.userId ? <Badge tone="accent">Con acceso</Badge> : <Badge tone="warning">Sin cuenta de acceso</Badge>}</div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
                <Button size="sm" variant="subtle" onClick={() => setPanel({ kind: 'schedule', barber: b })}>
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Horario
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPanel({ kind: 'private', barber: b })}>
                  <Settings2 className="h-3.5 w-3.5" aria-hidden /> Datos
                </Button>
                {!b.userId && (
                  <Button size="sm" variant="ghost" onClick={() => setPanel({ kind: 'access', barber: b })}>
                    <KeyRound className="h-3.5 w-3.5" aria-hidden /> Acceso
                  </Button>
                )}
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => toggle(b)}>
                  {b.status === 'active' ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={panel?.kind === 'new'} onClose={close} title="Nuevo barbero" description="Se crea con un horario sugerido que puedes ajustar.">
        <form onSubmit={create} className="space-y-4" noValidate>
          <Input label="Nombre completo *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} />
          <Input label="Especialidad" placeholder="Fade, barba clásica…" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          <Input label="Teléfono (privado)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      {panel && panel.kind !== 'new' && (
        <Modal
          isOpen
          onClose={close}
          title={panel.barber.fullName}
          description={panel.kind === 'schedule' ? 'Jornada, descansos y ausencias' : panel.kind === 'private' ? 'Datos privados' : 'Cuenta de acceso'}
          size={panel.kind === 'schedule' ? 'lg' : 'md'}
        >
          {panel.kind === 'schedule' && (
            <ScheduleEditor
              initialSchedule={panel.barber.schedule}
              initialBlocked={panel.barber.blockedDates}
              onSave={async (schedule, blocked) => {
                await barbersService.updateAvailability(panel.barber.id, schedule, blocked);
                barbers.reload();
              }}
            />
          )}
          {panel.kind === 'private' && <PrivateForm barber={panel.barber} onDone={done} />}
          {panel.kind === 'access' && <AccessForm barber={panel.barber} onDone={done} />}
        </Modal>
      )}
    </>
  );
};
