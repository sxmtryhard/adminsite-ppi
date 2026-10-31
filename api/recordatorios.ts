import { timingSafeEqual } from 'node:crypto';
import { readMailConfig } from '../server/config.js';
import { sendReminders, tomorrowInBogota } from '../server/appointmentMail.js';
import { bearer, sendJson, type Req, type Res } from '../server/http.js';

/**
 * GET /api/recordatorios — la ejecuta el Cron de Vercel una vez al día (vercel.json).
 * Vercel envía `Authorization: Bearer <CRON_SECRET>`; sin ese secreto nadie más puede dispararla.
 */
const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export default async function handler(req: Req, res: Res): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return sendJson(res, 503, { error: 'CRON_SECRET no está configurado.' });
  const token = bearer(req);
  if (!token || !sameSecret(token, secret)) return sendJson(res, 401, { error: 'No autorizado.' });

  const { config } = readMailConfig();
  if (!config) return sendJson(res, 503, { error: 'El envío de correos no está configurado.' });

  try {
    const date = tomorrowInBogota();
    const result = await sendReminders(config, date);
    return sendJson(res, 200, { date, ...result });
  } catch (err) {
    console.error('recordatorios:', err instanceof Error ? err.message : 'error');
    return sendJson(res, 500, { error: 'No fue posible enviar los recordatorios.' });
  }
}
