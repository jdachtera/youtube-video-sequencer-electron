import { app, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';
import { extractVideoId, getInnerTube } from './youtubeApi';
import { ensureBinary } from './youtubeDownload';

/**
 * Seekable video preview for the search panel. The renderer can't fetch
 * googlevideo directly (CORS), so the main process runs a tiny local HTTP server
 * that a <video> element points at:
 *
 *  - progressive videos stream straight through, with Range requests forwarded
 *    to googlevideo (true streaming + seeking, no download, no extra binary);
 *  - everything else falls back to a yt-dlp + (system) ffmpeg merge written to a
 *    cache file, which the server then serves with Range support.
 */

type PreviewEntry =
  | { mode: 'proxy'; directUrl: string }
  | { mode: 'file'; filePath: string };

const entries = new Map<string, PreviewEntry>();
const resolvedUrls = new Map<string, { directUrl: string; at: number }>();
const RESOLVED_TTL = 60 * 60 * 1000; // googlevideo URLs are good for hours

let serverPort = 0;

const previewCacheDir = (): string =>
  join(app.getPath('userData'), 'preview-cache');

/**
 * Resolve a progressive (combined audio+video) stream URL through youtubei.js,
 * reusing the warm Innertube session — no process spawn, so it's near-instant
 * when it succeeds. Modern YouTube often exposes only adaptive (split) formats
 * or withholds the stream behind SABR/bot checks; in those cases `chooseFormat`
 * throws and we return null so the caller falls back to yt-dlp.
 */
const resolveProgressiveUrlViaInnertube = async (
  url: string,
): Promise<string | null> => {
  try {
    const innertube = await getInnerTube();
    const info = await innertube.getInfo(extractVideoId(url));
    const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
    const directUrl = await format.decipher(innertube.session.player);
    return directUrl?.startsWith('http') ? directUrl : null;
  } catch {
    return null;
  }
};

/** Resolve a single progressive (combined audio+video) stream URL, or null. */
const resolveProgressiveUrl = (
  binary: string,
  url: string,
): Promise<string | null> =>
  new Promise((resolve) => {
    const child = spawn(binary, [
      '--no-warnings',
      '--no-playlist',
      '-f',
      'best[acodec!=none][vcodec!=none]',
      '-g',
      url,
    ]);
    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk.toString()));
    child.on('error', () => resolve(null));
    child.on('close', (code) => {
      const first = out.trim().split('\n').filter(Boolean)[0];
      resolve(code === 0 && first?.startsWith('http') ? first : null);
    });
  });

/** Download + merge audio/video to an mp4 (yt-dlp uses ffmpeg from PATH). */
const downloadMerged = (
  binary: string,
  url: string,
  dest: string,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(binary, [
      '--no-warnings',
      '--no-playlist',
      '-f',
      'bv*+ba/b',
      '--merge-output-format',
      'mp4',
      '-o',
      dest,
      url,
    ]);
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(stderr.trim().slice(-300) || `yt-dlp exited ${code}`),
          ),
    );
  });

/** Forward the request's Range to googlevideo and pipe the response back. */
const proxyRange = (
  directUrl: string,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const forward = (target: string, redirectsLeft: number) => {
    const headers: Record<string, string> = {};
    if (req.headers.range) headers.range = req.headers.range;

    const upstream = httpsRequest(target, { method: 'GET', headers }, (up) => {
      const status = up.statusCode ?? 502;
      if (
        [301, 302, 303, 307, 308].includes(status) &&
        up.headers.location &&
        redirectsLeft > 0
      ) {
        up.resume();
        forward(up.headers.location, redirectsLeft - 1);
        return;
      }

      const outHeaders: Record<string, string | string[]> = {
        'accept-ranges': 'bytes',
      };
      for (const header of [
        'content-type',
        'content-length',
        'content-range',
        'cache-control',
      ]) {
        const value = up.headers[header];
        if (value !== undefined) outHeaders[header] = value;
      }
      res.writeHead(status, outHeaders);
      up.pipe(res);
    });

    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.on('close', () => upstream.destroy());
    upstream.end();
  };

  forward(directUrl, 3);
};

/** Serve a local file with HTTP Range support so the <video> can seek. */
const serveFile = (
  filePath: string,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  let total: number;
  try {
    total = statSync(filePath).size;
  } catch {
    res.writeHead(404).end();
    return;
  }

  const match = req.headers.range
    ? /bytes=(\d*)-(\d*)/.exec(req.headers.range)
    : null;

  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = Math.min(match[2] ? Number(match[2]) : total - 1, total - 1);
    res.writeHead(206, {
      'content-type': 'video/mp4',
      'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${total}`,
      'content-length': end - start + 1,
    });
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'content-type': 'video/mp4',
      'accept-ranges': 'bytes',
      'content-length': total,
    });
    createReadStream(filePath).pipe(res);
  }
};

const startServer = () => {
  if (serverPort) return;

  const server = createServer((req, res) => {
    const token = (req.url ?? '')
      .split('?')[0]
      .split('/')
      .filter(Boolean)
      .pop();
    const entry = token ? entries.get(token) : undefined;
    if (!entry) {
      res.writeHead(404).end();
      return;
    }
    if (entry.mode === 'proxy') proxyRange(entry.directUrl, req, res);
    else serveFile(entry.filePath, req, res);
  });

  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (address && typeof address === 'object') serverPort = address.port;
  });
};

/** Expose the `yt:preview` bridge: returns a local, seekable URL for a video. */
export const registerPreviewServer = (): void => {
  startServer();

  ipcMain.handle('yt:preview', async (_event, url: string) => {
    // 1. Progressive stream — proxy with Range support (cache the resolved URL).
    const cached = resolvedUrls.get(url);
    let directUrl =
      cached && Date.now() - cached.at < RESOLVED_TTL ? cached.directUrl : null;

    // Try the JS path first: it reuses the warm Innertube session and avoids a
    // cold yt-dlp spawn entirely when YouTube still serves a progressive format.
    if (!directUrl) {
      directUrl = await resolveProgressiveUrlViaInnertube(url);
    }

    // Fall back to yt-dlp only when the JS path came up empty — no need to
    // download the ~10 MB binary when Innertube already resolved a stream.
    if (!directUrl) {
      const binary = await ensureBinary();
      directUrl = await resolveProgressiveUrl(binary, url);
    }
    if (directUrl) resolvedUrls.set(url, { directUrl, at: Date.now() });

    const token = randomUUID();

    if (directUrl) {
      entries.set(token, { mode: 'proxy', directUrl });
      return `http://127.0.0.1:${serverPort}/preview/${token}`;
    }

    // 2. Fallback — download + merge with ffmpeg, then serve the cached file.
    const binary = await ensureBinary();
    const dir = previewCacheDir();
    mkdirSync(dir, { recursive: true });
    const filePath = join(
      dir,
      `${createHash('sha256').update(url).digest('hex')}.mp4`,
    );
    if (!existsSync(filePath)) {
      await downloadMerged(binary, url, filePath);
    }
    entries.set(token, { mode: 'file', filePath });
    return `http://127.0.0.1:${serverPort}/preview/${token}`;
  });
};
