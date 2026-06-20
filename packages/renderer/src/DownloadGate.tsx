import { css } from '@emotion/css';

const RELEASES_URL =
  'https://github.com/jdachtera/youtube-video-sequencer-electron/releases';

/**
 * Shown when the renderer is opened in a normal web browser instead of the
 * desktop shell (e.g. someone visits the GitHub Pages URL directly). The UI is a
 * desktop app — the Tone.js audio engine, the local sample browser and the
 * yt-dlp downloader all need the Electron host — so a browser gets a "download
 * the app" page rather than a half-working sequencer.
 */
export const DownloadGate = () => (
  <div
    class={css`
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: radial-gradient(circle at 50% 30%, #2c2c2c, #161616 70%);
      color: #e6e6e6;
      font-family: 'oswald', system-ui, sans-serif;
    `}
  >
    <div
      class={css`
        max-width: 420px;
        text-align: center;
      `}
    >
      <h1
        class={css`
          margin: 0 0 4px;
          font-size: 40px;
          letter-spacing: 1px;
          color: #ff9100;
        `}
      >
        Megarack
      </h1>
      <p
        class={css`
          margin: 0 0 24px;
          font-size: 16px;
          color: #aaa;
        `}
      >
        A desktop sequencer for YouTube audio.
      </p>
      <p
        class={css`
          margin: 0 0 28px;
          font-size: 15px;
          line-height: 1.5;
          color: #cfcfcf;
        `}
      >
        Megarack runs as a desktop app — it needs a native audio engine and
        downloader that a browser can't provide. Download the build for your
        platform to get started.
      </p>
      <a
        href={RELEASES_URL}
        target="_blank"
        rel="noreferrer"
        class={css`
          display: inline-block;
          padding: 12px 28px;
          border-radius: 6px;
          background: #ff9100;
          color: #161616;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          &:hover {
            background: #ffa733;
          }
        `}
      >
        Download the app
      </a>
      <p
        class={css`
          margin: 18px 0 0;
          font-size: 13px;
          color: #777;
        `}
      >
        macOS · Windows · Linux
      </p>
    </div>
  </div>
);
