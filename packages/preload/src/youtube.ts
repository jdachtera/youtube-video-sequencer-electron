import { Innertube, Log } from 'youtubei.js';
import { search } from '@jdachtera/youtube-search-without-api-key';

// youtubei.js is chatty about YouTube's ever-changing response shapes (e.g.
// "Unable to find matching run for attachment run"). Those are harmless parser
// warnings for our metadata-only use, so keep the console to real errors.
Log.setLevel(Log.Level.ERROR);

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

// YouTube's native length buckets (mirrors YoutubeDuration in exposedVars).
type YoutubeDuration =
  | 'all'
  | 'under_three_mins'
  | 'three_to_twenty_mins'
  | 'over_twenty_mins';

// "1:02:03" / "3:45" -> seconds. null when it can't be parsed.
const durationToSeconds = (raw?: string | null): number | null => {
  if (!raw) return null;
  const parts = raw.split(':').map((p) => Number(p));
  if (!parts.length || parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
};

const matchesDuration = (
  raw: string | null | undefined,
  duration?: YoutubeDuration,
): boolean => {
  if (!duration || duration === 'all') return true;
  const seconds = durationToSeconds(raw);
  // Keep results whose length we can't read rather than dropping them.
  if (seconds == null) return true;
  if (duration === 'under_three_mins') return seconds < 180;
  if (duration === 'three_to_twenty_mins')
    return seconds >= 180 && seconds <= 1200;
  if (duration === 'over_twenty_mins') return seconds > 1200;
  return true;
};

const yt = {
  // The desktop app filters server-side (main-process innertube). The browser
  // fallback's scraping search takes no filter param, so filter its results
  // client-side by their reported length — best-effort (a page of long videos
  // can still yield few short hits), but the length buttons now work on web.
  async search(term: string, duration?: YoutubeDuration) {
    const results = await search(term);
    return results.filter((result) =>
      matchesDuration(
        result.duration_raw ?? result.snippet?.duration,
        duration,
      ),
    );
  },
  getInfo: async (
    url: string,
  ): Promise<{ basic_info: { title: string; thumbnail?: string } }> => {
    const innertube = await getInnerTube();
    const videoId = extractVideoId(url);

    const cacheKey = `video-info-cache-${videoId}`;

    const now = Date.now();

    try {
      const cache = localStorage.getItem(cacheKey);
      if (!cache) throw new Error('No cache found');
      const cacheEntry = JSON.parse(cache) as {
        result?: { basic_info: { title: string; thumbnail?: string } };
        expiresAt?: number;
      };
      if (!cacheEntry.result || (cacheEntry.expiresAt ?? 0) <= now)
        throw new Error('No cache found');
      return cacheEntry.result;
    } catch {
      const info = await innertube.getInfo(videoId);

      // Return a plain, structured-clone-safe object: the full VideoInfo is a
      // class instance whose methods/getters can't cross the context bridge
      // (that threw "An object could not be cloned"). The renderer uses the
      // title and a single thumbnail URL (the sampler cover).
      const thumbnails = info.basic_info?.thumbnail ?? [];
      const thumbnail = thumbnails.length
        ? thumbnails.reduce((a, b) => ((b.width ?? 0) > (a.width ?? 0) ? b : a))
            .url
        : '';
      const result = {
        basic_info: { title: info.basic_info?.title ?? '', thumbnail },
      };

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

  // Overridden in exposedVars.ts; no local preview server in the browser.
  getPreviewUrl: async (_url: string): Promise<string> => {
    throw new Error('Video preview is only available in the desktop app.');
  },
};

export default yt;
