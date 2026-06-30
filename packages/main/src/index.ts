import { app } from 'electron';
import './security-restrictions';
import { installDefaultMenu, registerMenuApi } from './appMenu';
import { registerHostApi } from './hostApi';
import { registerImageProxy } from './imageProxy';
import { restoreOrCreateWindow } from './mainWindow';
import { registerPreviewServer } from './previewServer';
import { getInnerTube, registerYoutubeApi } from './youtubeApi';
import { ensureBinary, registerYoutubeDownload } from './youtubeDownload';

/**
 * Expose the YouTube search/metadata, yt-dlp-backed audio download, seekable
 * video preview, cross-origin image proxy, and host-info bridges to the
 * renderer. All run in the main process so the preload can stay a thin,
 * sandboxed contextBridge layer.
 */
registerYoutubeApi();
registerYoutubeDownload();
registerPreviewServer();
registerImageProxy();
registerHostApi();
registerMenuApi();

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', restoreOrCreateWindow);

/**
 * Disable Hardware Acceleration for more power-save
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on('activate', restoreOrCreateWindow);

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(installDefaultMenu)
  .then(restoreOrCreateWindow)
  .catch((e) => console.error('Failed create window:', e));

/**
 * Warm up the slow first-use costs in the background once the app is ready:
 *  - the Innertube session (a config round-trip) so the first search/preview is
 *    quick instead of paying setup on the first keystroke;
 *  - the yt-dlp binary download so the first audio download / preview fallback
 *    isn't also waiting on a ~10 MB fetch.
 * Both are best-effort; failures (e.g. offline) are retried lazily on demand.
 */
const warmUpYoutube = () => {
  // Both are best-effort; failures (e.g. offline) are retried lazily on demand.
  getInnerTube().catch(() => undefined);
  ensureBinary().catch(() => undefined);
};
app
  .whenReady()
  .then(warmUpYoutube)
  .catch(() => undefined);

/**
 * Install Vue.js or some other devtools in development mode only
 */
if (import.meta.env.DEV) {
  app
    .whenReady()
    .then(() => import('electron-devtools-installer'))
    .then(({ default: installExtension, APOLLO_DEVELOPER_TOOLS }) =>
      installExtension(APOLLO_DEVELOPER_TOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true,
        },
      }),
    )

    .catch((e) => console.error('Failed install extension:', e));
}

/**
 * Check new app version in production mode only
 */
if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error('Failed check updates:', e));
}
