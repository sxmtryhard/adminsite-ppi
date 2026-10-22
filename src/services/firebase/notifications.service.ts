import {
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

  subscribe(userId: string, onChange: (items: AppNotification[]) => void, onError: (err: unknown) => void) {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => {
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
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onChange(items);
      },
      onError
    );
  },

  markRead: (id: string) => updateDoc(doc(db, 'notifications', id), { read: true }),
  remove: (id: string) => deleteDoc(doc(db, 'notifications', id)),
};
