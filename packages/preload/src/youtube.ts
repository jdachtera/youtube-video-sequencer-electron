import ytdl from 'ytdl-core';
import { search } from '@jdachtera/youtube-search-without-api-key';

const yt = {
  async search(term: string) {
    return await search(term);
  },
  getInfo: async (url: string) => {
    const cacheKey = `video-info-cache-${url}`;

    const now = Date.now();

    try {
      const cache = localStorage.getItem(cacheKey);
      if (!cache) throw new Error('No cache found');
      const cacheEntry = JSON.parse(cache) as {
        result?: ytdl.videoInfo;
        expiresAt?: number;
      };
      if (!cacheEntry.result || (cacheEntry.expiresAt ?? 0) <= now)
        throw new Error('No cache found');
      return cacheEntry.result;
    } catch {
      const result = await ytdl.getInfo(url);
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
