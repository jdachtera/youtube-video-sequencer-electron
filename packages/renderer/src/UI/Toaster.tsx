import { css } from '@emotion/css';
import { For } from 'solid-js';
import type { NotificationType } from '../notifications';
import { dismissNotification, notifications } from '../notifications';

const backgrounds: Record<NotificationType, string> = {
  info: '#2f5d8a',
  success: '#2f7d44',
  error: '#9b3030',
};

/**
 * Renders the global notification queue as dismissable toasts in the bottom-right
 * corner. Click a toast to dismiss it early.
 */
export const Toaster = () => (
  <div
    class={css`
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 360px;
      pointer-events: none;
    `}
  >
    <For each={notifications()}>
      {(notification) => (
        <div
          role="status"
          title="Click to dismiss"
          onClick={() => dismissNotification(notification.id)}
          class={css`
            pointer-events: auto;
            cursor: pointer;
            background: ${backgrounds[notification.type]};
            color: #fff;
            padding: 10px 14px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
            font-size: 13px;
            line-height: 1.35;
            word-break: break-word;
          `}
        >
          {notification.message}
        </div>
      )}
    </For>
  </div>
);
