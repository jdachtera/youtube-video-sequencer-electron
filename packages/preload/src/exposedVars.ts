/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron';

export type ExposedVars = typeof exposedVars;

/**
 * Search result shape the renderer consumes. Mirrors the main-process
 * `YoutubeSearchResult` (packages/main/src/youtubeApi.ts); the two are matched
 * structurally across the (untyped) IPC boundary.
 */
export interface YoutubeSearchResult {
  id: string;
  url: string;
  title: string;
  description: string;
  duration_raw: string;
  snippet: { thumbnails: { url: string } };
}

/**
 * A serializable native-menu item the renderer sends to the shell over IPC
 * (no functions cross the bridge). Items with an `id` route their click back to
 * the renderer via `host.onMenuClick`; items with a built-in `role` (copy,
 * paste, quit, togglefullscreen, …) use Electron's native behavior.
 */
export interface MenuItemSpec {
  id?: string;
  label?: string;
  role?: string;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  accelerator?: string;
  registerAccelerator?: boolean;
  enabled?: boolean;
  checked?: boolean;
  submenu?: MenuItemSpec[];
}

const exposedVars = {
  host: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping');
    },
    setZoomFactor: (zoom: number) => {
      ipcRenderer.send('set-zoom', zoom);
    },
    on(channel: string, func: (...args: any[]) => void) {
      const validChannels = ['ipc-example'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel: string, func: (...args: any[]) => void) {
      const validChannels = ['ipc-example'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
    // Describe the desktop shell to the renderer: its IPC/contextBridge contract
    // version, app version, and platform. A remotely-loaded (GitHub Pages)
    // renderer reads this to detect an out-of-date shell.
    getInfo: (): Promise<{
      apiVersion: number;
      appVersion: string;
      platform: string;
    }> => ipcRenderer.invoke('host:info'),
    // Which renderer "channel" (Pages deployment / branch) the UI is loaded
    // from, and whether remote loading is configured at all.
    getChannel: (): Promise<{ current: string; hasRemote: boolean }> =>
      ipcRenderer.invoke('host:getChannel'),
    // Switch channel: persists the choice and reloads the window from the
    // selected branch's deployment (falling back to the bundled copy).
    setChannel: (branch: string): Promise<void> =>
      ipcRenderer.invoke('host:setChannel', branch),
    // Branch names available to switch to (from the GitHub API, via main).
    listBranches: (): Promise<string[]> =>
      ipcRenderer.invoke('host:listBranches'),
    // Native application menu, defined by the renderer so menu changes ship with
    // the web UI — no Electron rebuild. Replace it any time (e.g. to reflect
    // enabled/checked state).
    setMenu: (template: MenuItemSpec[]): Promise<void> =>
      ipcRenderer.invoke('host:setMenu', template),
    // Subscribe to clicks on renderer-defined (id'd) menu items. Returns an
    // unsubscribe function.
    onMenuClick: (callback: (id: string) => void): (() => void) => {
      const listener = (_event: unknown, id: string) => callback(id);
      ipcRenderer.on('menu:click', listener);
      return () => ipcRenderer.removeListener('menu:click', listener);
    },
  },
  yt: {
    // Search + metadata run in the main process (youtubei.js); the preload
    // only forwards over IPC so it needs no Node modules.
    search: (term: string): Promise<YoutubeSearchResult[]> =>
      ipcRenderer.invoke('yt:search', term),
    getInfo: (url: string): Promise<{ basic_info: { title: string } }> =>
      ipcRenderer.invoke('yt:getInfo', url),
    // Audio downloads go to yt-dlp running in the main process (see
    // packages/main/src/youtubeDownload.ts).
    fetchVideo: (url: string): Promise<ArrayBuffer> =>
      ipcRenderer.invoke('yt:download', url),
    // Subscribe to download progress emitted by the main process. Returns an
    // unsubscribe function.
    onDownloadProgress: (
      callback: (progress: {
        url: string;
        phase: 'binary' | 'audio' | 'done';
        progress: number;
      }) => void,
    ): (() => void) => {
      const listener = (
        _event: unknown,
        payload: {
          url: string;
          phase: 'binary' | 'audio' | 'done';
          progress: number;
        },
      ) => callback(payload);
      ipcRenderer.on('yt:download-progress', listener);
      return () => ipcRenderer.removeListener('yt:download-progress', listener);
    },
    // Inspect / clear the on-disk audio cache (main process).
    getCacheSize: (): Promise<number> => ipcRenderer.invoke('yt:cache-size'),
    clearCache: (): Promise<number> => ipcRenderer.invoke('yt:clear-cache'),
    // Resolve a local, seekable URL for previewing a video (main process).
    getPreviewUrl: (url: string): Promise<string> =>
      ipcRenderer.invoke('yt:preview', url),
  },
  media: {
    // Fetch a cross-origin image (e.g. a YouTube thumbnail) in the main process
    // and get it back as a `data:` URL, so the sandboxed renderer can show it
    // with webSecurity enabled / when served from a remote origin. Resolves to
    // an empty string on any failure.
    fetchImage: (url: string): Promise<string> =>
      ipcRenderer.invoke('media:fetchImage', url),
  },
};

export default exposedVars;
