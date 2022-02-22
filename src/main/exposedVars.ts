/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron';
import ytdl from 'ytdl-core';
import { search } from 'youtube-search-without-api-key';

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
    async search(term: string) {
      return await search(term);
    },
    getInfo: async (url: string) => {
      const result = await ytdl.getInfo(url);

      return result;
    },

    fetchVideo: async (url: string): Promise<ArrayBuffer | string> => {
      const response = await fetch(url);

      const buffer = await response.arrayBuffer();

      return buffer;
    },
  },
};

export default exposedVars;
