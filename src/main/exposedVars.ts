/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron';
import ytdl from 'ytdl-core';

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
    getYouTubeVideoMeta: async (url: string) => {
      try {
        const result = await ytdl.getInfo(url);

        const audioTracks = result.formats.filter(
          (entry) => !entry.hasVideo && entry.hasAudio
        );

        const sourceFormat = audioTracks
          .sort((a, b) => (a.audioBitrate! > b.audioBitrate! ? 1 : -1))
          .shift();

        return {
          title: result.videoDetails.title,
          sourceUrl: sourceFormat!.url,
        };
      } catch (e) {
        console.dir(e);
        throw e;
      }
    },

    fetchVideo: async (url: string): Promise<ArrayBuffer | string> => {
      const response = await fetch(url);

      const buffer = await response.arrayBuffer();

      return buffer;
    },
  },
};

export default exposedVars;
