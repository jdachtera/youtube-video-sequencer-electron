import { BrowserWindow } from 'electron';
import { join } from 'path';
import { URL } from 'url';
import { UpsertKeyValue } from './util';

async function createWindow() {
  const browserWindow = new BrowserWindow({
    show: false, // Use 'ready-to-show' event to show window
    webPreferences: {
      // Locked-down renderer: no Node in the renderer, an isolated context, and
      // a sandboxed preload. All privileged work (youtubei.js search/metadata,
      // yt-dlp downloads, the preview server, the on-disk cache) runs in the
      // main process and is reached only through the minimal contextBridge API
      // in preload/src/exposedVars.ts.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Let the search-panel audio preview start playing after its async
      // (yt-dlp) fetch, which breaks the user-gesture chain Chromium normally
      // requires for autoplay.
      autoplayPolicy: 'no-user-gesture-required',
      // Full same-origin enforcement: every cross-origin fetch now goes through
      // the main process (youtubei.js search/metadata, yt-dlp, the preview
      // server, and the image proxy that returns thumbnails as data URLs), so
      // the renderer never needs to reach the network directly.
      webSecurity: true,
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
      preload: join(__dirname, '../../preload/dist/index.cjs'),
    },
  });

  /**
   * If you install `show: true` then it can cause issues when trying to close the window.
   * Use `show: false` and listener events `ready-to-show` to fix these issues.
   *
   * @see https://github.com/electron/electron/issues/25012
   */
  browserWindow.on('ready-to-show', () => {
    // Open maximized so the rack has room by default.
    browserWindow?.maximize();
    browserWindow?.show();

    if (import.meta.env.DEV) {
      browserWindow?.webContents.openDevTools();
    }
  });

  browserWindow.webContents?.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      const { requestHeaders } = details;
      UpsertKeyValue(requestHeaders, 'Access-Control-Allow-Origin', ['*']);
      callback({ requestHeaders });
    },
  );

  browserWindow.webContents?.session.webRequest.onHeadersReceived(
    (details, callback) => {
      const { responseHeaders = {} } = details;
      UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Origin', ['*']);
      UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Headers', ['*']);
      callback({
        responseHeaders,
      });
    },
  );

  /**
   * Where to load the renderer from:
   *  - the Vite dev server in development;
   *  - otherwise the bundled `file://` build that ships inside the app.
   *
   * Optionally, a remote renderer (the GitHub Pages "canary" deployment) can be
   * loaded instead, so the web UI can be updated without shipping a new Electron
   * build. It's strictly opt-in via `MEGARACK_RENDERER_URL` (runtime env) or a
   * baked-in `VITE_RENDERER_URL` (build time); with neither set the app behaves
   * exactly as before. If the remote can't be reached we always fall back to the
   * bundled copy, so the app still starts offline.
   */
  const bundledUrl = new URL(
    '../renderer/dist/index.html',
    'file://' + __dirname,
  ).toString();

  const remoteRendererUrl =
    process.env.MEGARACK_RENDERER_URL || import.meta.env.VITE_RENDERER_URL;

  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_resolve, reject) =>
        setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
      ),
    ]);

  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_SERVER_URL !== undefined
  ) {
    await browserWindow.loadURL(import.meta.env.VITE_DEV_SERVER_URL);
  } else if (remoteRendererUrl) {
    try {
      await withTimeout(browserWindow.loadURL(remoteRendererUrl), 8000);
    } catch (error) {
      console.warn(
        `[renderer] remote load of ${remoteRendererUrl} failed; using bundled copy:`,
        error,
      );
      // A fresh loadURL supersedes any still-pending remote navigation.
      await browserWindow.loadURL(bundledUrl);
    }
  } else {
    await browserWindow.loadURL(bundledUrl);
  }

  return browserWindow;
}

/**
 * Restore existing BrowserWindow or Create new BrowserWindow
 */
export async function restoreOrCreateWindow() {
  let window = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());

  if (window === undefined) {
    window = await createWindow();
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
}
