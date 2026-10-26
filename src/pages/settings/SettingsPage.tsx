import React, { useState } from 'react';
import { Building2, CalendarClock, DatabaseZap } from 'lucide-react';
import { Card, PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert, Spinner } from '@/components/common/Feedback';
import { useSession } from '@/context/auth-context';
import { useSettings } from '@/hooks/useSettings';
import { settingsService } from '@/services/firebase/settings.service';
import { migrationService } from '@/services/firebase/migration.service';
import { useAsync } from '@/hooks/useAsync';
import { toUserMessage } from '@/services/firebase/helpers';
import { cleanText } from '@/domain/validation';
import type { BusinessSettings } from '@/types/settings.types';

const intIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

/** Detecta y adapta documentos creados con la versión anterior del sistema. */
const MigrationCard: React.FC = () => {
  const { actor } = useSession();
  const scan = useAsync(() => migrationService.scan(), []);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const pending = (scan.data?.products.length ?? 0) + (scan.data?.barbers.length ?? 0);

  const run = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const result = await migrationService.run(actor);
      setMessage({ tone: 'success', text: `Migración completada: ${result.products} producto(s) y ${result.barbers} barbero(s).` });
      scan.reload();
    } catch (err) {
      setMessage({ tone: 'error', text: toUserMessage(err, 'No fue posible migrar los datos.') });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card title="Datos de la versión anterior" icon={DatabaseZap} description="Mueve costos y teléfonos que estaban en documentos públicos a sus colecciones privadas.">
      {scan.loading ? (
        <Spinner />
      ) : scan.error ? (
        <Alert>{scan.error}</Alert>
      ) : pending === 0 ? (
        <Alert tone="success">Todos los datos están en el formato actual.</Alert>
      ) : (
        <div className="space-y-3 text-sm">
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {scan.data?.products.map((p) => (
              <li key={p.id}>
                Producto <span className="text-ink">{p.name}</span>: costo visible públicamente; se moverá al costo privado.
              </li>
            ))}
            {scan.data?.barbers.map((b) => (
              <li key={b.id}>
                Barbero <span className="text-ink">{b.name}</span>: {b.hasPhone ? 'teléfono visible públicamente; se moverá a datos privados' : 'faltan campos nuevos'}.
              </li>
            ))}
          </ul>
          <p className="text-xs text-subtle">No cambia precios, existencias ni horarios. Queda registrado en la auditoría.</p>
          <Button onClick={run} isLoading={running}>
            Migrar {pending} registro(s)
          </Button>
        </div>
      )}
      {message && <Alert tone={message.tone} className="mt-3">{message.text}</Alert>}
    </Card>
  );
};

export const SettingsPage: React.FC = () => {
  const { actor } = useSession();
  const { settings, saved, loading, error, reload } = useSettings();
  const [draft, setDraft] = useState<BusinessSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const form = draft ?? settings;

  const set = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => setDraft({ ...form, [key]: value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !intIn(form.cancellationMinHours, 0, 72) ||
      !intIn(form.minLeadMinutes, 0, 1440) ||
      !intIn(form.bookingWindowDays, 1, 180) ||
      !intIn(form.defaultMinStock, 0, 1000)
    ) {
      setMessage({ tone: 'error', text: 'Revisa los valores: deben ser enteros dentro de los rangos indicados.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await settingsService.save(
        { ...form, studioName: cleanText(form.studioName, 80), phone: cleanText(form.phone, 20), address: cleanText(form.address, 120) },
        actor
      );
      setDraft(null);
      reload();
      setMessage({ tone: 'success', text: 'Configuración guardada.' });
    } catch (err) {
      setMessage({ tone: 'error', text: toUserMessage(err, 'No fue posible guardar.') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="Configuración del negocio" description="Datos del estudio y políticas de reserva. Los cambios quedan en la auditoría." />
      {error && <Alert>{error}</Alert>}
      {!saved && (
        <Alert tone="warning">
          Se muestran valores sugeridos que aún no han sido aprobados ni guardados. Revísalos con el propietario y guárdalos para aplicarlos.
        </Alert>
      )}
      <form onSubmit={save} className="space-y-6">
        <Card title="Datos del estudio" icon={Building2}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre del negocio" value={form.studioName} onChange={(e) => set('studioName', e.target.value)} required />
            <Input label="Teléfono de contacto" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Input label="Dirección" value={form.address} onChange={(e) => set('address', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Moneda" value="COP (peso colombiano)" disabled />
              <Input label="Zona horaria" value="America/Bogota" disabled />
            </div>
          </div>
        </Card>

        <Card title="Políticas de reserva" icon={CalendarClock} description="Las jornadas y descansos se configuran por barbero.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Antelación para cancelar/reprogramar (h)"
              type="number"
              min={0}
              max={72}
              value={form.cancellationMinHours}
              onChange={(e) => set('cancellationMinHours', Number(e.target.value))}
              hint="Aplica a clientes. 0–72."
            />
            <Input
              label="Antelación mínima para reservar (min)"
              type="number"
              min={0}
              max={1440}
              step={15}
              value={form.minLeadMinutes}
              onChange={(e) => set('minLeadMinutes', Number(e.target.value))}
            />
            <Input
              label="Ventana de reservas (días)"
              type="number"
              min={1}
              max={180}
              value={form.bookingWindowDays}
              onChange={(e) => set('bookingWindowDays', Number(e.target.value))}
            />
            <Input
              label="Mínimo de existencias por defecto"
              type="number"
              min={0}
              value={form.defaultMinStock}
              onChange={(e) => set('defaultMinStock', Number(e.target.value))}
            />
          </div>
          <p className="mt-3 text-xs text-subtle">La agenda trabaja en bloques fijos de 15 minutos y servicios de hasta 120 minutos.</p>
        </Card>

        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <div className="flex justify-end">
          <Button type="submit" isLoading={saving}>
            Guardar configuración
          </Button>
        </div>
      </form>
      <MigrationCard />
    </>
  );
};
