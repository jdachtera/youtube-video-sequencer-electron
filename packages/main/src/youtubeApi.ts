import { ipcMain } from 'electron';
import { Innertube, Log } from 'youtubei.js';

// YouTube's native, server-side length buckets. Mirrors YoutubeDuration in the
// preload's exposedVars (the renderer sends one of these over IPC).
type YoutubeDuration =
  | 'all'
  | 'under_three_mins'
  | 'three_to_twenty_mins'
  | 'over_twenty_mins';

// Clone-safe result shape sent back over IPC. Mirrors YoutubeSearchResult in
// the preload; the search panel reads url/title/duration_raw/thumbnail.
interface YoutubeSearchResult {
  id: { videoId: string };
  url: string;
  title: string;
  description: string;
  duration_raw: string | null;
  snippet: {
    url: string;
    duration: string | null;
    publishedAt: string | null;
    thumbnails: { url: string };
    title: string;
    views: string | number;
  };
  views: string | number;
}

// youtubei.js is chatty about YouTube's ever-changing response shapes; keep the
// console to real errors.
Log.setLevel(Log.Level.ERROR);

// YouTube search + metadata run here in the main process (Node) rather than in
// the preload, so the preload can stay a thin, sandbox-safe contextBridge layer
// with no Node modules. The renderer reaches these over IPC via window.yt.
let innertubePromise: Promise<Innertube> | null = null;
const getInnerTube = () => {
  if (!innertubePromise) {
    innertubePromise = Innertube.create();
  }
  return innertubePromise;
};

const extractVideoId = (url: string) => {
  const videoId = new URL(url).searchParams.get('v');
  if (!videoId) throw new Error('No video id found');
  return videoId;
};

const INFO_CACHE_TTL = 1000 * 60 * 60 * 24;
const infoCache = new Map<
  string,
  { title: string; thumbnail: string; expiresAt: number }
>();

// Pick the highest-resolution thumbnail innertube returns. The array order
// isn't guaranteed, so choose by width rather than position.
const pickThumbnail = (
  thumbnails: { url?: string; width?: number }[] | undefined,
): string => {
  if (!thumbnails?.length) return '';
  const best = thumbnails.reduce((a, b) =>
    (b.width ?? 0) > (a.width ?? 0) ? b : a,
  );
  return best?.url ?? '';
};

// Map a youtubei.js search node to the clone-safe result shape. Returns null
// for non-video nodes (shelves, channels, shorts lockups, …). Each field is
// read defensively because youtubei.js node shapes shift between node types.
const mapSearchVideo = (node: any): YoutubeSearchResult | null => {
  const videoId: string | undefined = node?.video_id ?? node?.id;
  if (!videoId || typeof videoId !== 'string') return null;

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const title: string =
    node?.title?.text ?? (typeof node?.title === 'string' ? node.title : '');

  // The `duration` getter can throw on nodes that lack the backing field.
  let durationText: string | null = null;
  try {
    durationText = node?.duration?.text ?? node?.length_text?.text ?? null;
  } catch {
    durationText = node?.length_text?.text ?? null;
  }

  const views: string =
    node?.view_count?.text ?? node?.short_view_count?.text ?? '';
  const publishedAt: string | null = node?.published?.text ?? null;

  return {
    id: { videoId },
    url,
    title,
    description: node?.description_snippet?.text ?? '',
    duration_raw: durationText,
    snippet: {
      url,
      duration: durationText,
      publishedAt,
      thumbnails: { url: pickThumbnail(node?.thumbnails) },
      title,
      views,
    },
    views,
  };
};

export const registerYoutubeApi = (): void => {
  ipcMain.handle(
    'yt:search',
    async (_event, term: string, duration?: YoutubeDuration) => {
      const innertube = await getInnerTube();
      // Ask YouTube to filter by length server-side, so short-clip searches
      // aren't starved by a page full of long videos.
      const filters =
        duration && duration !== 'all' ? ({ duration } as const) : undefined;
      const result = await innertube.search(term, filters);
      const videos = (result.videos ?? []) as any[];
      return videos
        .map(mapSearchVideo)
        .filter((item): item is YoutubeSearchResult => item !== null);
    },
  );

  ipcMain.handle('yt:getInfo', async (_event, url: string) => {
    const videoId = extractVideoId(url);

    const cached = infoCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        basic_info: { title: cached.title, thumbnail: cached.thumbnail },
      };
    }

    const innertube = await getInnerTube();
    const info = await innertube.getInfo(videoId);
    // Return a plain, structured-clone-safe object across IPC; the renderer
    // uses the title and a single thumbnail URL (the sampler's cover image).
    const title = info.basic_info?.title ?? '';
    const thumbnail = pickThumbnail(info.basic_info?.thumbnail);
    infoCache.set(videoId, {
      title,
      thumbnail,
      expiresAt: Date.now() + INFO_CACHE_TTL,
    });
    return { basic_info: { title, thumbnail } };
  });
};
