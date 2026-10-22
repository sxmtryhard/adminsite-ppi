export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
