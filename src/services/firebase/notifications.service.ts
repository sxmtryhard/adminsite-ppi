import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.config';
import { str, strOrNull, toIso, type Actor } from './helpers';
import type { AppNotification } from '@/types/notification.types';

export interface NotificationInput {
  userIds: (string | null | undefined)[];
  title: string;
  body: string;
  link: string | null;
}

export const notificationsService = {
  /**
   * Notificaciones dentro de la aplicación. No envían correo ni SMS: eso requiere un
   * proveedor externo y Cloud Functions (plan Blaze), pendiente de configuración.
   */
  async notify(input: NotificationInput, actor: Actor): Promise<void> {
    const recipients = [...new Set(input.userIds.filter((u): u is string => Boolean(u) && u !== actor.uid))];
    if (recipients.length === 0) return;
    const batch = writeBatch(db);
    for (const userId of recipients) {
      batch.set(doc(collection(db, 'notifications')), {
        userId,
        audience: null,
        title: input.title.slice(0, 120),
        body: input.body.slice(0, 400),
        link: input.link,
        read: false,
        actorUid: actor.uid,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  },

  /**
   * Aviso para la bandeja compartida de administración (todos los administradores lo ven;
   * marcarlo como leído lo marca para todos). Quien lo genera no necesita conocer a los admins.
   */
  async notifyAdmins(input: Omit<NotificationInput, 'userIds'>, actor: Actor): Promise<void> {
    await addDoc(collection(db, 'notifications'), {
      userId: null,
      audience: 'admin',
      title: input.title.slice(0, 120),
      body: input.body.slice(0, 400),
      link: input.link,
      read: false,
      actorUid: actor.uid,
      createdAt: serverTimestamp(),
    });
  },

  /** Notificaciones personales; los administradores reciben además la bandeja compartida. */
  subscribe(
    userId: string,
    includeAdminInbox: boolean,
    onChange: (items: AppNotification[]) => void,
    onError: (err: unknown) => void
  ) {
    const base = collection(db, 'notifications');
    const queries = [query(base, where('userId', '==', userId), limit(50))];
    if (includeAdminInbox) queries.push(query(base, where('audience', '==', 'admin'), limit(50)));

    const results = queries.map(() => [] as AppNotification[]);
    const emit = () =>
      onChange(results.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50));

    const unsubscribers = queries.map((q, idx) =>
      onSnapshot(
        q,
        (snap) => {
          results[idx] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: str(data.userId),
              title: str(data.title),
              body: str(data.body),
              link: strOrNull(data.link),
              read: data.read === true,
              createdAt: toIso(data.createdAt),
            };
          });
          emit();
        },
        onError
      )
    );
    return () => unsubscribers.forEach((u) => u());
  },

  markRead: (id: string) => updateDoc(doc(db, 'notifications', id), { read: true }),
  remove: (id: string) => deleteDoc(doc(db, 'notifications', id)),
};
