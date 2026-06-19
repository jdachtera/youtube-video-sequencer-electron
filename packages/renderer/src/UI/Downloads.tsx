import { css } from '@emotion/css';
import { For, Show } from 'solid-js';
import type { DownloadPhase } from '../downloads';
import { downloads } from '../downloads';

const labelFor = (phase: DownloadPhase) =>
  phase === 'binary' ? 'Preparing downloader…' : 'Downloading audio…';

/**
 * Fixed bottom-left overlay showing in-flight YouTube downloads with a progress
 * bar. The first ever download also fetches the ~40MB yt-dlp binary ("Preparing
 * downloader…"), which would otherwise look like the app had frozen.
 */
export const Downloads = () => (
  <Show when={downloads().length}>
    <div
      class={css`
        position: fixed;
        bottom: 16px;
        left: 16px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 240px;
      `}
    >
      <For each={downloads()}>
        {(download) => (
          <div
            class={css`
              background: #333;
              color: #fff;
              padding: 8px 10px;
              border-radius: 4px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
              font-size: 12px;
            `}
          >
            <div
              class={css`
                margin-bottom: 6px;
              `}
            >
              {labelFor(download.phase)} {Math.round(download.progress * 100)}%
            </div>
            <div
              class={css`
                height: 4px;
                background: #555;
                border-radius: 2px;
                overflow: hidden;
              `}
            >
              <div
                class={css`
                  height: 100%;
                  width: ${Math.round(download.progress * 100)}%;
                  background: #46d323;
                  transition: width 0.2s;
                `}
              />
            </div>
          </div>
        )}
      </For>
    </div>
  </Show>
);
