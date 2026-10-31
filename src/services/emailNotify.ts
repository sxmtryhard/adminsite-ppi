import { auth } from './firebase/firebase.config';

export type EmailEvent = 'booked' | 'status' | 'rescheduled';

/**
 * Pide al servidor (/api/notificar) que envíe los correos de una acción sobre la cita.
 * Mejor esfuerzo: si el correo no está configurado o falla, la cita ya quedó guardada y la
 * notificación dentro de la app sigue funcionando. El servidor lee la cita de Firestore y
 * comprueba que quien llama participa en ella.
 */
export const requestEmail = async (appointmentId: string, event: EmailEvent): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const idToken = await user.getIdToken();
    await fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ appointmentId, event }),
      keepalive: true,
    });
  } catch {
    // Sin red o sin servidor de correo (p. ej. en desarrollo local): no afecta la operación.
  }
};
