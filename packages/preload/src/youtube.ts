import ytdl from 'ytdl-core';
import { search } from '@jdachtera/youtube-search-without-api-key';

const yt = {
  async search(term: string) {
    return await search(term);
  },
  getInfo: async (url: string) => {
    const cacheKey = `video-info-cache-${url}`;
    try {
      const cache = localStorage.getItem(cacheKey)!;
      const cachedResult = JSON.parse(cache) as ytdl.videoInfo;
      if (!cachedResult) throw new Error('No cache found');
      return cachedResult;
    } catch {
      const result = await ytdl.getInfo(url);
      localStorage.setItem(cacheKey, JSON.stringify(result));
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
