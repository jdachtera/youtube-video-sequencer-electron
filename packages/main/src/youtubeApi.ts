import { search as scrapeSearch } from '@jdachtera/youtube-search-without-api-key';
import { ipcMain } from 'electron';
import { Innertube, Log } from 'youtubei.js';

// youtubei.js is chatty about YouTube's ever-changing response shapes; keep the
// console to real errors.
Log.setLevel(Log.Level.ERROR);

// YouTube search + metadata run here in the main process (Node) rather than in
// the preload, so the preload can stay a thin, sandbox-safe contextBridge layer
// with no Node modules. The renderer reaches these over IPC via window.yt.
let innertubePromise: Promise<Innertube> | null = null;
export const getInnerTube = (): Promise<Innertube> => {
  if (!innertubePromise) {
    innertubePromise = Innertube.create();
  }
  return innertubePromise;
};

export const extractVideoId = (url: string): string => {
  const videoId = new URL(url).searchParams.get('v');
  if (!videoId) throw new Error('No video id found');
  return videoId;
};

/**
 * The slimmed-down search result the renderer actually consumes. Both search
 * back-ends (Innertube and the HTML-scrape fallback) map onto this shape, so
 * the result type stays stable regardless of which one served the request.
 */
export interface YoutubeSearchResult {
  id: string;
  url: string;
  title: string;
  description: string;
  duration_raw: string;
  snippet: { thumbnails: { url: string } };
}

const watchUrl = (id: string): string =>
  `https://www.youtube.com/watch?v=${id}`;

/**
 * Primary search path: YouTube's Innertube JSON API via youtubei.js (already a
 * dependency, and a process-wide singleton). It returns a compact JSON payload
 * we parse natively, instead of fetching and regex-deciphering the ~1 MB HTML
 * results page the scrape fallback relies on — which is the bulk of the old
 * search latency.
 */
const innertubeSearch = async (
  term: string,
): Promise<YoutubeSearchResult[]> => {
  const innertube = await getInnerTube();
  const search = await innertube.search(term, { type: 'video' });

  // `videos` flattens the mixed feed (shelves, refinements, …) down to the
  // video nodes. The node union is broad, so read fields defensively.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (search.videos as any[])
    .map((video) => {
      const id: unknown = video?.video_id ?? video?.id;
      if (typeof id !== 'string' || !id) return undefined;
      const description =
        typeof video?.description === 'string'
          ? video.description
          : video?.description_snippet?.text ?? '';
      return {
        id,
        url: watchUrl(id),
        title: video?.title?.text ?? '',
        description,
        duration_raw: video?.duration?.text ?? video?.length_text?.text ?? '',
        snippet: {
          thumbnails: {
            url:
              video?.thumbnails?.[0]?.url ?? video?.best_thumbnail?.url ?? '',
          },
        },
      } satisfies YoutubeSearchResult;
    })
    .filter((result): result is YoutubeSearchResult => result !== undefined);
};

/**
 * Fallback search path: the HTML-scrape library. Kept because the Innertube API
 * occasionally trips YouTube's bot checks; when it does we degrade to the
 * slower-but-different scrape rather than returning nothing.
 */
const fallbackSearch = async (term: string): Promise<YoutubeSearchResult[]> => {
  const raw = await scrapeSearch(term);
  return raw.map((item) => ({
    id: item.id?.videoId ?? '',
    url: item.url,
    title: item.title,
    description: item.description ?? '',
    duration_raw: item.duration_raw ?? '',
    snippet: { thumbnails: { url: item.snippet?.thumbnails?.url ?? '' } },
  }));
};

const searchVideos = async (term: string): Promise<YoutubeSearchResult[]> => {
  if (!term.trim()) return [];
  try {
    const results = await innertubeSearch(term);
    if (results.length) return results;
  } catch (error) {
    // Fall through to the scrape fallback below.
    Log.error('youtubeApi', error as Error);
  }
  return fallbackSearch(term);
};

const TITLE_CACHE_TTL = 1000 * 60 * 60 * 24;
const titleCache = new Map<string, { title: string; expiresAt: number }>();

export const registerYoutubeApi = (): void => {
  ipcMain.handle('yt:search', (_event, term: string) => searchVideos(term));

  ipcMain.handle('yt:getInfo', async (_event, url: string) => {
    const videoId = extractVideoId(url);

    const cached = titleCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      return { basic_info: { title: cached.title } };
    }

    const innertube = await getInnerTube();
    const info = await innertube.getInfo(videoId);
    // Return a plain, structured-clone-safe object across IPC; only the title
    // is used by the renderer.
    const title = info.basic_info?.title ?? '';
    titleCache.set(videoId, { title, expiresAt: Date.now() + TITLE_CACHE_TTL });
    return { basic_info: { title } };
  });
};
