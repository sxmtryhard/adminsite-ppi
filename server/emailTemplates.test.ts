import { describe, expect, it } from 'vitest';
import { contentFor, deliveryKey, escapeHtml, longDate, renderMail, type MailAppointment } from './emailTemplates.js';

const appt: MailAppointment = {
  clientName: 'Carlos',
  barberName: 'Juan',
  serviceName: 'Corte clásico',
  date: '2026-11-02',
  time: '11:00',
  status: 'pending',
  cancelReason: null,
};

describe('plantillas de correo', () => {
  it('escribe la fecha en español', () => {
    expect(longDate('2026-11-02')).toBe('lunes 2 de noviembre');
  });

  it('cada perfil recibe su propio mensaje al reservar', () => {
    expect(contentFor({ type: 'booked' }, 'client', appt)?.subject).toBe('Recibimos tu solicitud de cita');
    expect(contentFor({ type: 'booked' }, 'client', { ...appt, status: 'confirmed' })?.subject).toBe('¡Tu cita está confirmada!');
    expect(contentFor({ type: 'booked' }, 'barber', appt)?.heading).toBe('Nueva cita en tu agenda');
    expect(contentFor({ type: 'booked' }, 'admin', appt)?.heading).toBe('Nueva solicitud de cita');
  });

  it('la cancelación incluye el motivo y el recordatorio es solo para el cliente', () => {
    const cancelled = contentFor({ type: 'status', status: 'cancelled' }, 'client', { ...appt, cancelReason: 'Viaje' });
    expect(cancelled?.lines).toContain('Motivo: Viaje.');
    expect(contentFor({ type: 'reminder' }, 'barber', appt)).toBeNull();
    expect(contentFor({ type: 'reminder' }, 'client', appt)?.subject).toBe('Recordatorio: tu cita es mañana a las 11:00');
  });

  it('estados sin correo devuelven null', () => {
    expect(contentFor({ type: 'status', status: 'in_progress' }, 'client', appt)).toBeNull();
    expect(contentFor({ type: 'status', status: 'confirmed' }, 'barber', appt)).toBeNull();
  });

  it('escapa el HTML de los datos', () => {
    const mail = renderMail(
      contentFor({ type: 'booked' }, 'barber', { ...appt, clientName: '<script>alert(1)</script>' })!,
      'XAC <Studio>',
      'https://app.test'
    );
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('XAC &lt;Studio&gt;');
    expect(mail.text).toContain('https://app.test/barbero/agenda');
    expect(escapeHtml(`"'&`)).toBe('&quot;&#39;&amp;');
  });

  it('la clave de envío distingue cada evento', () => {
    expect(deliveryKey('a1', { type: 'booked' }, appt)).toBe('a1_booked');
    expect(deliveryKey('a1', { type: 'status', status: 'cancelled' }, appt)).toBe('a1_status_cancelled');
    expect(deliveryKey('a1', { type: 'rescheduled' }, appt)).toBe('a1_rescheduled_2026-11-02_1100');
    expect(deliveryKey('a1', { type: 'reminder' }, appt)).toBe('a1_reminder_2026-11-02');
  });
});
