export type CapturedNotification = {
  to: string;
  subject: string;
  html: string;
  createdAt: string;
  verificationToken?: string;
};

const inboxByEmail = new Map<string, CapturedNotification[]>();

export function recordNotification(message: { to: string; subject: string; html: string; verificationToken?: string }): void {
  const key = message.to.trim().toLowerCase();
  const list = inboxByEmail.get(key) ?? [];
  list.push({ ...message, createdAt: new Date().toISOString() });
  inboxByEmail.set(key, list);
}

export function getLatestNotification(email: string): CapturedNotification | null {
  const key = email.trim().toLowerCase();
  const list = inboxByEmail.get(key);
  if (!list || list.length === 0) {
    return null;
  }

  return list[list.length - 1] ?? null;
}

export function clearNotificationsForEmail(email: string): void {
  inboxByEmail.delete(email.trim().toLowerCase());
}
