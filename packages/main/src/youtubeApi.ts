import { search } from '@jdachtera/youtube-search-without-api-key';
import { ipcMain } from 'electron';
import { Innertube, Log } from 'youtubei.js';

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

export const registerYoutubeApi = (): void => {
  ipcMain.handle('yt:search', (_event, term: string) => search(term));

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
