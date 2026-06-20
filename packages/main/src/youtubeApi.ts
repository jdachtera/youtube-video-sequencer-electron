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

const TITLE_CACHE_TTL = 1000 * 60 * 60 * 24;
const titleCache = new Map<string, { title: string; expiresAt: number }>();

export const registerYoutubeApi = (): void => {
  ipcMain.handle('yt:search', (_event, term: string) => search(term));

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
