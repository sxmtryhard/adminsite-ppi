import React from 'react';
import { Scissors } from 'lucide-react';

export const AuthShell: React.FC<{ title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }> = ({
  title,
  subtitle,
  children,
  footer,
}) => (
  <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-bg px-4 py-10">
    <div
      className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      aria-hidden
    />
    <main className="relative w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-strong text-white shadow-[0_8px_30px_rgba(79,70,229,0.45)]">
          <Scissors className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-subtle">XAC Barber Studio</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <div className="card p-6 sm:p-7">{children}</div>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
    </main>
  </div>
);
