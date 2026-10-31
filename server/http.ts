import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Utilidades HTTP sobre Node puro (sin dependencias de Vercel), para que los mismos manejadores
 * sirvan en una función de Vercel o en un servidor Node/Express en Hostinger.
 */
export type Req = IncomingMessage & { body?: unknown };
export type Res = ServerResponse;

export const sendJson = (res: Res, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const MAX_BODY = 10_000;

/** Cuerpo JSON: usa el ya interpretado por la plataforma o lo lee del stream (máx. 10 KB). */
export const readJson = async (req: Req): Promise<Record<string, unknown>> => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  if (typeof req.body === 'string') return JSON.parse(req.body) as Record<string, unknown>;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new Error('too-large');
  }
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
};

export const bearer = (req: Req): string | null => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
};
