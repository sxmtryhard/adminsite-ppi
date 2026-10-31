import type { IncomingMessage, ServerResponse } from 'node:http';

// TEMPORAL: diagnóstico de carga de módulos en Vercel. Se elimina tras corregir.
export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const out: Record<string, string> = { node: process.version };
  const tryImport = async (name: string, load: () => Promise<unknown>) => {
    try {
      await load();
      out[name] = 'ok';
    } catch (e) {
      out[name] = e instanceof Error ? e.message.slice(0, 300) : 'error';
    }
  };
  await tryImport('http', () => import('../server/http.js'));
  await tryImport('config', () => import('../server/config.js'));
  await tryImport('templates', () => import('../server/emailTemplates.js'));
  await tryImport('firebase-admin', () => import('firebase-admin/app'));
  await tryImport('nodemailer', () => import('nodemailer'));
  await tryImport('appointmentMail', () => import('../server/appointmentMail.js'));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(out));
}
