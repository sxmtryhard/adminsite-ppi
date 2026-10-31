import { formatCOP, formatDateTime } from '@/lib/format';
import { PAYMENT_LABELS, type Sale } from '@/types/sale.types';
import { isLogoDataUrl } from './resizeImage';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * Abre el comprobante de una venta en una ventana nueva lista para imprimir o guardar en PDF.
 * Es un comprobante interno de venta, no una factura electrónica (DIAN).
 */
export const printReceipt = (sale: Sale, business: { name: string; phone: string; address: string; logo?: string | null }): boolean => {
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return false;

  const rows = sale.items
    .map(
      (i) => `<tr><td>${i.quantity} × ${escapeHtml(i.name)}</td><td class="r">${formatCOP(i.subtotal)}</td></tr>`
    )
    .join('');

  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante ${sale.id.slice(0, 8)}</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:24px;font-size:13px}
  h1{font-size:18px;margin:0}.muted{color:#555;font-size:12px}
  table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:4px 0;border-bottom:1px dashed #ccc}
  .r{text-align:right}.total td{font-weight:700;font-size:15px;border-bottom:none}
  .void{color:#b91c1c;font-weight:700;border:2px solid #b91c1c;padding:6px;text-align:center;margin:8px 0}
  @media print{button{display:none}body{margin:8px}}
</style></head><body>
${business.logo && isLogoDataUrl(business.logo) ? `<img src="${business.logo}" alt="" style="width:64px;height:64px;object-fit:contain;margin-bottom:6px">` : ''}
<h1>${escapeHtml(business.name)}</h1>
<div class="muted">${escapeHtml(business.address)}${business.phone ? ' · ' + escapeHtml(business.phone) : ''}</div>
<p class="muted">Comprobante de venta N.º ${sale.id.slice(0, 8).toUpperCase()}<br>${formatDateTime(sale.createdAt)}</p>
${sale.status === 'voided' ? `<div class="void">ANULADA${sale.voidReason ? ': ' + escapeHtml(sale.voidReason) : ''}</div>` : ''}
<p class="muted">Cliente: ${escapeHtml(sale.clientName || 'Ocasional')}${sale.barberName ? '<br>Atendió: ' + escapeHtml(sale.barberName) : ''}</p>
<table>${rows}
<tr><td>Subtotal</td><td class="r">${formatCOP(sale.subtotal)}</td></tr>
${sale.discount > 0 ? `<tr><td>Descuento</td><td class="r">−${formatCOP(sale.discount)}</td></tr>` : ''}
<tr class="total"><td>Total</td><td class="r">${formatCOP(sale.total)}</td></tr></table>
<p class="muted">Medio de pago: ${PAYMENT_LABELS[sale.paymentMethod]}</p>
<p class="muted">Comprobante interno, no válido como factura electrónica.</p>
<button onclick="window.print()">Imprimir / Guardar PDF</button>
</body></html>`);
  win.document.close();
  win.focus();
  return true;
};
