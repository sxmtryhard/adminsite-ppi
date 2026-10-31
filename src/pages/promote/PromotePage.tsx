import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, MessageCircle, Printer } from 'lucide-react';
import { Card, PageHeader } from '@/components/common/Layout';
import { Button } from '@/components/common/Button';
import { Alert, Spinner } from '@/components/common/Feedback';
import { useLogo } from '@/hooks/useBranding';
import { useSettings } from '@/hooks/useSettings';

/** Afiche imprimible con QR hacia /instalar y enlaces para compartir la app con los clientes. */
export const PromotePage: React.FC = () => {
  const { settings } = useSettings();
  const logo = useLogo();
  const installUrl = `${window.location.origin}/instalar`;
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(installUrl, { width: 600, margin: 1, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQrError(true));
  }, [installUrl]);

  const shareText = `¡Reserva tu corte en ${settings.studioName} desde el celular! Instala la app gratis aquí: ${installUrl}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Promocionar la app"
        description="Imprime el afiche para el local y comparte el enlace con tus clientes."
        actions={
          <Button variant="outline" onClick={() => window.print()} disabled={!qr}>
            <Printer className="h-4 w-4" aria-hidden /> Imprimir afiche
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Afiche: siempre en colores de papel para que la vista previa coincida con la impresión. */}
        <section className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 text-center text-neutral-900 shadow-2xl print:max-w-none print:shadow-none" aria-label="Afiche para imprimir">
          {logo ? (
            <img src={logo} alt="" className="mx-auto h-20 w-20 object-contain" />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-3xl font-bold text-white">X</div>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">{settings.studioName}</p>
          <h2 className="mt-2 text-3xl font-bold leading-tight">Escanea y reserva tu próximo corte</h2>
          <p className="mt-2 text-sm text-neutral-600">Instala la app gratis: elige barbero, día y hora en segundos.</p>
          <div className="mx-auto mt-6 w-64">
            {qr ? <img src={qr} alt={`Código QR hacia ${installUrl}`} className="w-full" /> : qrError ? null : <Spinner />}
          </div>
          <p className="mt-4 break-all text-sm font-medium text-indigo-700">{installUrl.replace(/^https?:\/\//, '')}</p>
          <p className="mt-6 text-xs text-neutral-500">Apunta la cámara de tu celular al código 📱</p>
        </section>

        <div className="no-print space-y-6">
          {qrError && <Alert>No fue posible generar el código QR. Puedes compartir el enlace igualmente.</Alert>}
          <Card title="Compartir el enlace">
            <div className="space-y-3">
              <p className="break-all rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-muted">{installUrl}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copy}>
                  <Copy className="h-4 w-4" aria-hidden /> {copied ? '¡Copiado!' : 'Copiar enlace'}
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-medium text-white hover:brightness-110"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden /> Compartir por WhatsApp
                </a>
              </div>
              <p className="text-xs text-subtle">Ideal para tus estados de WhatsApp, Instagram o el grupo de clientes.</p>
            </div>
          </Card>
          <Card title="Consejos">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>Pon el afiche en el espejo o junto a la caja.</li>
              <li>Pídele al cliente que escanee mientras paga: la próxima cita la reserva solo.</li>
              <li>El logo se cambia en Configuración.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
};
