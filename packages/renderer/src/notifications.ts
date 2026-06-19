import { createSignal } from 'solid-js';

export type NotificationType = 'info' | 'success' | 'error';

export type Notification = {
  id: number;
  message: string;
  type: NotificationType;
};

const [notifications, setNotifications] = createSignal<Notification[]>([]);

export { notifications };

let nextId = 1;

export const dismissNotification = (id: number) => {
  setNotifications((current) => current.filter((n) => n.id !== id));
};

/**
 * Surface a transient message to the user (rendered by <Toaster />). Errors stay
 * up longer and must be dismissed-friendly; everything auto-dismisses. Returns
 * the id so callers can dismiss early (e.g. when a long task finishes).
 */
export const notify = (
  message: string,
  type: NotificationType = 'info',
  timeout = type === 'error' ? 8000 : 4000,
): number => {
  const id = nextId++;
  setNotifications((current) => [...current, { id, message, type }]);

  if (timeout > 0) {
    setTimeout(() => dismissNotification(id), timeout);
  }

  return id;
};
