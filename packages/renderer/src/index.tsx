import { render } from 'solid-js/web';
import { App } from './App';
import { DownloadGate } from './DownloadGate';

// Is the renderer running inside the desktop shell? The preload exposes a real
// host API (with getInfo); a plain browser has none. The userAgent check is a
// backup. localhost is treated as the shell too, so the web build can still be
// opened in a browser during development.
const isDesktopShell =
  typeof (window as unknown as { host?: { getInfo?: unknown } }).host
    ?.getInfo === 'function' || /\bElectron\//.test(navigator.userAgent);
const isDevHost = ['localhost', '127.0.0.1', '[::1]'].includes(
  window.location.hostname,
);

(async () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const root = document.getElementById('root')!;

  // Opened in a normal browser (e.g. the GitHub Pages site): don't boot the app
  // — point people to the desktop download instead.
  if (!isDesktopShell && !isDevHost) {
    render(() => <DownloadGate />, root);
    return;
  }

  if (!window.yt) {
    window.global = window;
    const yt = await import('../../preload/src/youtube');

    window.yt = yt.default;

    window.host = {
      zoom: () => {
        //
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  render(() => <App />, root);
})();
