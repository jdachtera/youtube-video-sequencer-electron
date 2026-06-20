import { ipcMain, net } from 'electron';

/**
 * Cross-origin image proxy for the renderer.
 *
 * The renderer is locked down (`webSecurity: true`, sandboxed, and — once it is
 * hosted on GitHub Pages — served from a real https origin), so it can't always
 * load YouTube thumbnails directly: they live on Google CDNs and CORS/CSP get in
 * the way. Instead the main process fetches the image with Electron's `net`
 * (which honours system proxy settings) and hands it back to the renderer as a
 * `data:` URL, which loads under any origin/policy.
 *
 * Results are cached in memory so re-renders and repeated searches don't refetch
 * the same thumbnails. Any failure (bad URL, disallowed host, network error,
 * non-image response) returns an empty string so callers fall back to their
 * placeholder.
 */

const cache = new Map<string, string>();
const MAX_ENTRIES = 500;

// Only proxy images from the CDNs we actually expect, so this can't be turned
// into a general-purpose SSRF fetcher by the renderer.
const ALLOWED_HOSTS = [
  'ytimg.com', // i.ytimg.com / i9.ytimg.com — video thumbnails
  'ggpht.com', // yt3.ggpht.com — channel avatars
  'googleusercontent.com',
  'youtube.com',
];

const isAllowed = (url: URL): boolean =>
  url.protocol === 'https:' &&
  ALLOWED_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );

export const registerImageProxy = (): void => {
  ipcMain.handle('media:fetchImage', async (_event, rawUrl: string) => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return '';
    }
    if (!isAllowed(url)) return '';

    const key = url.toString();
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    try {
      const response = await net.fetch(key);
      if (!response.ok) return '';
      const contentType = response.headers.get('content-type') ?? 'image/jpeg';
      if (!contentType.startsWith('image/')) return '';

      const buffer = Buffer.from(await response.arrayBuffer());
      const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

      // Bounded FIFO cache: drop the oldest entry once full.
      if (cache.size >= MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, dataUrl);
      return dataUrl;
    } catch {
      return '';
    }
  });
};
