/* eslint-disable @typescript-eslint/no-var-requires */
const { contextBridge, ipcRenderer } = require('electron');
const ytdl = require('ytdl-core');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping');
    },
    on(channel, func) {
      const validChannels = ['ipc-example'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      const validChannels = ['ipc-example'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});

contextBridge.exposeInMainWorld('yt', {
  getYouTubeVideoSource: async (url) => {
    try {
      const result = await ytdl.getInfo(url);

      const audioTracks = result.formats.filter(
        (entry) => !entry.hasVideo && entry.hasAudio
      );

      const sourceFormat = audioTracks
        .sort((a, b) => a.audioBitrate > b.audioBitrate)
        .shift();

      console.log(sourceFormat);

      return sourceFormat.url;
    } catch (e) {
      console.dir(e);
      throw e;
    }
  },
});
