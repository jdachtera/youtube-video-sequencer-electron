import { css } from '@emotion/css';
import { createResource, Show } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';

export const BrowserListItem = (props: {
  isSelected: boolean;
  thumbnail: string;
  name: string;
  /** Optional short overlay on the thumbnail (e.g. a video duration). */
  meta?: string;
  onSelect: () => void;
  onAdd: () => void;
}) => {
  // Remote thumbnails are fetched in the main process and returned as data URLs
  // so they render with webSecurity enabled (and from a remote origin). Empty
  // or already-local thumbnails pass through unchanged; if the bridge is absent
  // (web fallback) we use the URL directly.
  const [resolvedThumbnail] = createResource(
    () => props.thumbnail,
    async (url) => {
      if (!url || url.startsWith('data:')) return url;
      const fetchImage = window.media?.fetchImage;
      if (!fetchImage) return url;
      try {
        return (await fetchImage(url)) || '';
      } catch {
        return '';
      }
    },
  );

  return (
    <li
      classList={{
        [css`
          display: flex;
          align-items: stretch;
          cursor: pointer;
          height: 72px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          border-left: 3px solid transparent;
          transition: background 0.1s ease, border-color 0.1s ease;
          &:hover {
            background: rgba(255, 255, 255, 0.05);
          }
        `]: true,
        [css`
          background: rgba(255, 145, 0, 0.14);
          border-left-color: #ff9100;
          &:hover {
            background: rgba(255, 145, 0, 0.18);
          }
        `]: props.isSelected,
      }}
    >
      <div
        class={css`
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 72px;
          height: 72px;
          background-color: #222;
          background-size: cover;
          background-position: 50% 50%;
          color: #555;
          font-size: 26px;
        `}
        style={
          resolvedThumbnail()
            ? { 'background-image': `url('${resolvedThumbnail()}')` }
            : undefined
        }
        onClick={() => props.onSelect()}
      >
        <Show when={!resolvedThumbnail()}>♪</Show>
        <Show when={props.meta}>
          <span
            class={css`
              position: absolute;
              right: 3px;
              bottom: 3px;
              padding: 1px 4px;
              border-radius: 3px;
              background: rgba(0, 0, 0, 0.8);
              color: #fff;
              font-family: 'oswald';
              font-size: 11px;
              line-height: 1.3;
            `}
          >
            {props.meta}
          </span>
        </Show>
      </div>
      <div
        class={css`
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          padding: 6px 8px;
          font-family: 'oswald';
          font-size: 13px;
          line-height: 1.3;
          color: #e6e6e6;
        `}
        onClick={() => props.onSelect()}
        title={props.name}
      >
        <span
          class={css`
            overflow: hidden;
            word-break: break-word;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
          `}
        >
          {props.name}
        </span>
      </div>
      <div
        class={css`
          display: flex;
          align-items: center;
          padding-right: 6px;
        `}
      >
        <ButtonWithLabel
          label="+"
          labelOnButton
          onClick={() => props.onAdd()}
        />
      </div>
    </li>
  );
};
