import { Innertube } from 'youtubei.js';
import { search } from '@jdachtera/youtube-search-without-api-key';

let innertubePromise: Promise<Innertube> | null = null;

const getInnerTube = () => {
  if (!innertubePromise) {
    innertubePromise = Innertube.create({
      fetch: async (request: RequestInfo | URL, init?: RequestInit) => {
        // Modify the request
        // and send it to the proxy

        // fetch the URL
        return fetch(request, init);
      },
    });
  }

  return innertubePromise;
};

const extractVideoId = (url: string) => {
  const parsedUrl = new URL(url);
  const videoId = parsedUrl.searchParams.get('v');
  if (!videoId) throw new Error('No video id found');
  return videoId;
};

const yt = {
  async search(term: string) {
    return await search(term);
  },
  getInfo: async (url: string): Promise<{ basic_info: { title: string } }> => {
    const innertube = await getInnerTube();
    const videoId = extractVideoId(url);

    const cacheKey = `video-info-cache-${videoId}`;

    const now = Date.now();

    try {
      const cache = localStorage.getItem(cacheKey);
      if (!cache) throw new Error('No cache found');
      const cacheEntry = JSON.parse(cache) as {
        result?: { basic_info: { title: string } };
        expiresAt?: number;
      };
      if (!cacheEntry.result || (cacheEntry.expiresAt ?? 0) <= now)
        throw new Error('No cache found');
      return cacheEntry.result;
    } catch {
      const info = await innertube.getInfo(videoId);

      // Return a plain, structured-clone-safe object: the full VideoInfo is a
      // class instance whose methods/getters can't cross the context bridge
      // (that threw "An object could not be cloned"). Only the title is used.
      const result = { basic_info: { title: info.basic_info?.title ?? '' } };

      localStorage.setItem(
        cacheKey,
        JSON.stringify({ result, expiresAt: now + 1000 * 60 * 60 * 24 }),
      );
      return result;
    }
  },

  // The real implementation runs through yt-dlp in the Electron main process
  // and is wired up in exposedVars.ts. This stub only runs in the browser-only
  // fallback (no Electron), where spawning a binary isn't possible.
  fetchVideo: async (_url: string): Promise<ArrayBuffer> => {
    throw new Error('Audio download is only available in the desktop app.');
  },

  // Overridden in exposedVars.ts with the real IPC subscription; the browser
  // fallback has no main process to report download progress.
  onDownloadProgress: (
    _callback: (progress: {
      url: string;
      phase: 'binary' | 'audio' | 'done';
      progress: number;
    }) => void,
  ): (() => void) => {
    return () => undefined;
  },

  // Overridden in exposedVars.ts; the browser fallback has no on-disk cache.
  getCacheSize: async (): Promise<number> => 0,
  clearCache: async (): Promise<number> => 0,
};

export default yt;
