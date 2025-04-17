import { Innertube } from 'youtubei.js';
import { search } from '@jdachtera/youtube-search-without-api-key';
import type { VideoInfo } from 'youtubei.js/dist/src/parser/youtube';
import type { Stream } from 'stream';

const yt = {
  async search(term: string) {
    return await search(term);
  },
  getInfo: async (url: string) => {
    const innertube = await Innertube.create({
      fetch: async (request: RequestInfo | URL, init?: RequestInit) => {
        // Modify the request
        // and send it to the proxy

        // fetch the URL
        return fetch(request, init);
      },
    });

    const parsedUrl = new URL(url);
    const videoId = parsedUrl.searchParams.get('v');

    if (!videoId) throw new Error('No video id found');
    const cacheKey = `video-info-cache-${videoId}`;

    const now = Date.now();

    try {
      const cache = localStorage.getItem(cacheKey);
      if (!cache) throw new Error('No cache found');
      const cacheEntry = JSON.parse(cache) as {
        result?: VideoInfo;
        expiresAt?: number;
      };
      if (!cacheEntry.result || (cacheEntry.expiresAt ?? 0) <= now)
        throw new Error('No cache found');
      return cacheEntry.result;
    } catch {
      const result = await innertube.getInfo(videoId);

      console.log({ result });
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ result, expiresAt: now + 1000 * 60 * 60 * 24 }),
      );
      return result;
    }
  },

  fetchVideo: async (url: string): Promise<ArrayBuffer | string> => {
    const response = await fetch(url);

    const buffer = await response.arrayBuffer();

    return buffer;
  },
};

export default yt;
