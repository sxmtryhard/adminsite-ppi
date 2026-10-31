import { readMailConfig } from '../server/config.js';
import { HttpError, notifyAppointment } from '../server/appointmentMail.js';
import { bearer, readJson, sendJson, type Req, type Res } from '../server/http.js';

/**
 * POST /api/notificar  { appointmentId, event: 'booked' | 'status' | 'rescheduled' }
 * Authorization: Bearer <ID token de Firebase>
 * Envía los correos de una acción sobre una cita. Sin configuración responde 503 y la app sigue.
 */
export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido.' });

  const { config } = readMailConfig();
  if (!config) return sendJson(res, 503, { error: 'El envío de correos no está configurado.' });

  const idToken = bearer(req);
  if (!idToken) return sendJson(res, 401, { error: 'Sesión requerida.' });

  try {
    const body = await readJson(req);
    const result = await notifyAppointment(config, { idToken, appointmentId: body.appointmentId, event: body.event });
    return sendJson(res, 200, result);
  } catch (err) {
    if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
    if (err instanceof SyntaxError || (err instanceof Error && err.message === 'too-large')) {
      return sendJson(res, 400, { error: 'Petición inválida.' });
    }
    console.error('notificar:', err instanceof Error ? err.message : 'error');
    return sendJson(res, 500, { error: 'No fue posible enviar el correo.' });
  }
}
