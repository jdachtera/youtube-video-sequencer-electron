import { css } from '@emotion/css';
import { createSignal, onMount } from 'solid-js';
import { notify } from '../notifications';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Footer control showing how much disk the on-disk audio cache uses, with a
 * button to clear it. Sits at the bottom of the side panel.
 */
export const CacheControl = () => {
  const [size, setSize] = createSignal(0);

  const refresh = async () => setSize((await window.yt.getCacheSize?.()) ?? 0);

  onMount(refresh);

  const clear = async () => {
    if (!window.confirm('Delete all cached audio downloads?')) return;
    const freed = (await window.yt.clearCache?.()) ?? 0;
    await refresh();
    notify(`Cleared ${formatBytes(freed)} of cached audio`, 'success');
  };

  return (
    <div
      class={css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-shrink: 0;
        padding: 6px 10px;
        border-top: 1px solid #3a3a3a;
        font-size: 11px;
        color: #bbb;
      `}
    >
      <span>Audio cache: {formatBytes(size())}</span>
      <button
        type="button"
        onClick={clear}
        disabled={size() === 0}
        class={css`
          cursor: pointer;
          font-size: 11px;
          padding: 2px 8px;
        `}
      >
        Clear
      </button>
    </div>
  );
};
