/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron';
import ytdl from 'ytdl-core';
import { search } from 'youtube-search-without-api-key';

export type ExposedVars = typeof exposedVars;

type SoundsDotComResponse = {
  result: {
    sounds: Sound[];
    sounds_releases: SoundsRelease[];
    total_results: string;
    next_page: string;
  };
};
type Category = {
  id: string;
  name: string;
  type: string;
  chain: [];
};

type Sound = {
  id: string;
  name: string;
  tier: string;
  traditional_key: string;
  duration: string;
  bpm: string;
  type: string;
  file_name: string;
  spectrum: string;
  waveform: string;
  signature: string;
  preview: string;
  preview_mp3: string;
  is_exclusive: boolean;
  categories: Category[];
  release_id: string;
  publisher_id: string;
  bit_depth: string;
  sample_rate: string;
};

type ReleaseDemo = {
  id: string;
  release_id: string;
  name: string;
  mp3: string;
};

type Genre = {
  id: string;
  name: string;
};

type GenreGroup = {
  id: string;
  name: string;
};

type SoundsRelease = {
  id: string;
  name: string;
  description: string;
  publisher_id: string;
  tier: string;
  type: string;
  label: string;
  release_date: string;
  is_exclusive: boolean;
  is_templateable: boolean;
  parent_publisher_id: string;
  total_sounds: string;
  cover_small: string;
  cover_large: string;
  publisher_name: string;
  demos: ReleaseDemo[];
  genres: Genre[];
  genre_groups: GenreGroup;
};

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
  },

  soundsDotCom: (() => {
    const API_URL = 'https://cdn-api-prd.sounds.com/api';

    const searchSounds = async ({
      instrument = '',
      character = '',
      type = 'one-shot',
      page = 0,
      limit = 20,
      ids = [],
      keyword = '',
    }) => {
      const params = new URLSearchParams({
        instrument,
        character,
        type,
        page: page.toString(),
        sound_id: ids.join(','),
        limit: limit.toString(),
        keyword,
      });

      [...params.keys()].forEach((name) => {
        if (!params.get(name) || params.get(name) === '') {
          params.delete(name);
        }
      });

      const response = await fetch(`${API_URL}/search?${params.toString()}`);
      const data = (await response.json()) as SoundsDotComResponse;

      return data;
    };

    const randomPage = () => Math.round(Math.random() * 100);

    const fetchRandomizedSound = async (
      instrument?: string,
      character?: string
    ) => {
      const {
        result: { sounds },
      } = await searchSounds({
        instrument,
        character,
        page: randomPage(),
        limit: 10,
      });

      return sounds[Math.round(Math.random() * sounds.length)];
    };

    return {
      fetchRandomizedSound,
      searchSounds,
    };
  })(),
};

export default exposedVars;
