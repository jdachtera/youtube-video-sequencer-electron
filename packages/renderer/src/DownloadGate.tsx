import { css } from '@emotion/css';

const LATEST_RELEASE_URL =
  'https://github.com/jdachtera/youtube-video-sequencer-electron/releases/latest';

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
        max-width: 460px;
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
        MegaRack
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
        MegaRack runs as a desktop app — it needs a native audio engine and
        downloader that a browser can't provide. Download the latest build for
        your platform to get started.
      </p>
      <a
        href={LATEST_RELEASE_URL}
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
        Download the latest release
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

      {/* MegaRack isn't code-signed/notarized yet, so macOS quarantines it and
          reports it as "damaged". Tell users how to get past Gatekeeper. */}
      <details
        class={css`
          margin: 28px auto 0;
          max-width: 460px;
          text-align: left;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid #3a3a3a;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #bdbdbd;
          line-height: 1.5;
          & summary {
            cursor: pointer;
            color: #e6e6e6;
            font-size: 14px;
          }
          & code {
            display: block;
            margin: 8px 0;
            padding: 8px 10px;
            background: #0e0e0e;
            border-radius: 5px;
            color: #ffb65c;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-all;
            user-select: all;
          }
        `}
      >
        <summary>macOS: “MegaRack is damaged and can't be opened”?</summary>
        <p>
          MegaRack isn't signed with an Apple Developer certificate yet, so
          macOS quarantines it on download. After dragging MegaRack to your
          Applications folder, open <strong>Terminal</strong> and run:
        </p>
        <code>xattr -dr com.apple.quarantine /Applications/MegaRack.app</code>
        <p>
          then open MegaRack normally. On Apple Silicon, if it still won't
          launch, also run:
        </p>
        <code>codesign --force --deep --sign - /Applications/MegaRack.app</code>
        <p
          class={css`
            margin-bottom: 0;
            color: #888;
          `}
        >
          (Right-click → Open usually doesn't clear the “damaged” message — the
          Terminal command above is the reliable fix.)
        </p>
      </details>
    </div>
  </div>
);
