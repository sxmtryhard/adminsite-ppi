import React from 'react';
import { Link } from 'react-router-dom';
import { BellRing, CalendarCheck2, Clock3 } from 'lucide-react';
import { BrandMark } from '@/components/common/BrandMark';
import { InstallActions } from '@/components/pwa/InstallActions';

const BENEFITS = [
  { icon: CalendarCheck2, text: 'Reserva en segundos y solo ves horas realmente libres.' },
  { icon: BellRing, text: 'Recibe el aviso cuando tu cita sea confirmada.' },
  { icon: Clock3, text: 'Cancela o reprograma desde tu celular.' },
];

/** Página pública a la que lleva el código QR del local: instalar la app y crear cuenta. */
export const InstallPage: React.FC = () => (
  <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-bg px-4 py-10">
    <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" aria-hidden />
    <main className="relative w-full max-w-sm text-center">
      <BrandMark className="mx-auto mb-4 h-20 w-20 rounded-3xl text-2xl shadow-[0_8px_30px_rgba(79,70,229,0.45)]" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-subtle">XAC Barber Studio</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Tu próximo corte, a un toque</h1>
      <p className="mt-1 text-sm text-muted">Instala la app gratis en tu celular. No ocupa espacio de tienda y se actualiza sola.</p>

      <div className="card mt-6 flex flex-col items-center gap-4 p-6">
        <InstallActions />
        <ul className="w-full space-y-2.5 border-t border-line pt-4 text-left">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-sm text-muted">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link to="/registro" className="font-medium text-accent hover:underline">
          Crear mi cuenta
        </Link>
        <Link to="/login" className="text-muted hover:text-ink">
          Ya tengo cuenta · Iniciar sesión
        </Link>
      </div>
    </main>
  </div>
);
