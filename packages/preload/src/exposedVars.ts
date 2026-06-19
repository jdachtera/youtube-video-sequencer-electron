/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron';
import yt from './youtube';

export type ExposedVars = typeof exposedVars;

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
  },
  yt: {
    ...yt,
    // Override the browser-only stub: route audio downloads to yt-dlp running
    // in the main process (see packages/main/src/youtubeDownload.ts).
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
};

export default exposedVars;
