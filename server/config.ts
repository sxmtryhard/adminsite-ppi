/**
 * Configuración del servidor de correo, leída de variables de entorno (Vercel hoy; Hostinger
 * después). Ningún secreto está en el código. Si falta algo, el envío queda desactivado.
 */
export interface MailConfig {
  serviceAccount: { projectId: string; clientEmail: string; privateKey: string };
  gmailUser: string;
  gmailAppPassword: string;
  appUrl: string;
  studioName: string;
}

const parseServiceAccount = (raw: string | undefined): MailConfig['serviceAccount'] | null => {
  if (!raw) return null;
  try {
    // Se acepta el JSON tal cual o codificado en base64 (más cómodo de pegar en algunos paneles).
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const data = JSON.parse(json) as Record<string, unknown>;
    const projectId = data.project_id;
    const clientEmail = data.client_email;
    const privateKey = data.private_key;
    if (typeof projectId !== 'string' || typeof clientEmail !== 'string' || typeof privateKey !== 'string') return null;
    return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
};

/** Devuelve la configuración completa o `null` con la lista de lo que falta (sin valores). */
export const readMailConfig = (env: NodeJS.ProcessEnv = process.env): { config: MailConfig | null; missing: string[] } => {
  const serviceAccount = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  const missing = [
    !serviceAccount && 'FIREBASE_SERVICE_ACCOUNT',
    !env.GMAIL_USER && 'GMAIL_USER',
    !env.GMAIL_APP_PASSWORD && 'GMAIL_APP_PASSWORD',
    !env.APP_URL && 'APP_URL',
  ].filter((v): v is string => Boolean(v));
  if (missing.length > 0 || !serviceAccount) return { config: null, missing };
  return {
    missing,
    config: {
      serviceAccount,
      gmailUser: env.GMAIL_USER as string,
      gmailAppPassword: (env.GMAIL_APP_PASSWORD as string).replace(/\s+/g, ''),
      appUrl: (env.APP_URL as string).replace(/\/+$/, ''),
      studioName: env.STUDIO_NAME || 'XAC Barber Studio',
    },
  };
};
