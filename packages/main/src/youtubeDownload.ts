import { app, ipcMain, net } from 'electron';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Audio downloads go through the yt-dlp binary instead of a pure-JS extractor.
 * yt-dlp is actively maintained against YouTube's signature deciphering, SABR
 * streaming and bot-check changes that broke the previous youtubei.js download
 * path. youtubei.js is kept for search and metadata only.
 *
 * The binary is fetched on first use into the app's userData directory, so
 * nothing extra has to be bundled or shipped with the installer.
 *
 * Downloaded audio is cached as the *compressed* source on disk
 * (userData/audio-cache), not as decoded PCM in IndexedDB. The compressed file
 * is ~15-20x smaller, isn't subject to browser storage eviction, and is decoded
 * on demand by the renderer's Web Audio context.
 */

const RELEASE_BASE =
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download';

const releaseAsset = (): string => {
  switch (process.platform) {
    case 'win32':
      return 'yt-dlp.exe';
    case 'darwin':
      return 'yt-dlp_macos';
    default:
      return 'yt-dlp_linux';
  }
};

const binaryPath = (): string =>
  join(
    app.getPath('userData'),
    'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
  );

type DownloadPhase = 'binary' | 'audio' | 'done';
type ProgressReporter = (phase: DownloadPhase, progress: number) => void;

let ensurePromise: Promise<string> | null = null;

/**
 * Download the yt-dlp binary into userData/bin on first use. Electron's `net`
 * stack follows redirects and honours the system proxy and certificate store,
 * unlike a raw `https` request.
 */
export const ensureBinary = (
  onProgress?: ProgressReporter,
): Promise<string> => {
  const dest = binaryPath();
  if (existsSync(dest)) return Promise.resolve(dest);
  if (ensurePromise) return ensurePromise;

  ensurePromise = new Promise<string>((resolve, reject) => {
    mkdirSync(join(app.getPath('userData'), 'bin'), { recursive: true });

    const request = net.request(`${RELEASE_BASE}/${releaseAsset()}`);
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(
          new Error(`Failed to download yt-dlp (HTTP ${response.statusCode})`),
        );
        return;
      }

      const contentLength = response.headers['content-length'];
      const total =
        Number(
          Array.isArray(contentLength) ? contentLength[0] : contentLength,
        ) || 0;
      let received = 0;

      const file = createWriteStream(dest);
      response.on('data', (chunk) => {
        file.write(chunk);
        received += chunk.length;
        if (total) onProgress?.('binary', received / total);
      });
      response.on('end', () =>
        file.end(() => {
          try {
            chmodSync(dest, 0o755);
          } catch {
            // chmod is unnecessary / unsupported on Windows
          }
          resolve(dest);
        }),
      );
      response.on('error', (error: Error) => reject(error));
    });
    request.on('error', reject);
    request.end();
  }).catch((error: Error) => {
    ensurePromise = null; // allow a retry on the next request
    throw error;
  });

  return ensurePromise;
};

const cacheDir = (): string => join(app.getPath('userData'), 'audio-cache');

const cachePathFor = (url: string): string =>
  join(cacheDir(), createHash('sha256').update(url).digest('hex'));

const toArrayBuffer = (buffer: Buffer): ArrayBuffer =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

type InFlightDownload = {
  promise: Promise<ArrayBuffer>;
  child: ReturnType<typeof spawn> | null;
  refs: number;
  cancelled: boolean;
};

/**
 * In-flight yt-dlp downloads keyed by URL. Two things ride on this:
 *  - de-duplication: if several samples request the same URL at once (e.g. a
 *    project with the same source in multiple slots loading on open), they share
 *    one yt-dlp run instead of spawning a process per slot.
 *  - cancellation: we keep a handle on the child process so a download can be
 *    aborted (yt:cancel) when its sample is removed before it finishes.
 */
const inFlightDownloads = new Map<string, InFlightDownload>();

const runYtDlp = async (
  url: string,
  entry: InFlightDownload,
  onProgress?: ProgressReporter,
): Promise<ArrayBuffer> => {
  const cachePath = cachePathFor(url);
  const binary = await ensureBinary(onProgress);
  const workDir = mkdtempSync(join(tmpdir(), 'yvs-yt-'));

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(binary, [
        '--no-playlist',
        '--no-warnings',
        '--newline',
        // Fetch DASH audio segments in parallel — yt-dlp otherwise pulls them
        // one at a time, which dominates the wall-clock on longer videos.
        '--concurrent-fragments',
        '4',
        '-f',
        'bestaudio[ext=m4a]/bestaudio',
        '-o',
        join(workDir, 'audio.%(ext)s'),
        url,
      ]);
      entry.child = child;

      let stderr = '';
      // yt-dlp prints "[download]  42.3%" lines (one per line thanks to
      // --newline); surface them as audio-phase progress.
      const reportProgress = (text: string) => {
        const match = text.match(/\[download\]\s+(\d{1,3}(?:\.\d+)?)%/);
        if (match) {
          onProgress?.('audio', Math.min(0.99, Number(match[1]) / 100));
        }
      };
      child.stdout.on('data', (chunk) => reportProgress(chunk.toString()));
      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        reportProgress(text);
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (entry.cancelled) {
          reject(new Error('download cancelled'));
        } else if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `yt-dlp exited with code ${code}: ${stderr.trim().slice(-300)}`,
            ),
          );
        }
      });
    });

    const [file] = readdirSync(workDir);
    if (!file) throw new Error('yt-dlp produced no output file');

    const buffer = readFileSync(join(workDir, file));

    // Persist the compressed source to the cache. Write to a temp path and
    // rename so a crash mid-write never leaves a corrupt cache entry.
    mkdirSync(cacheDir(), { recursive: true });
    const tempCachePath = `${cachePath}.${process.pid}.tmp`;
    writeFileSync(tempCachePath, buffer);
    renameSync(tempCachePath, cachePath);

    return toArrayBuffer(buffer);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
};

/**
 * Return the best audio-only stream for a YouTube URL as compressed bytes,
 * serving from the on-disk cache when present and otherwise downloading it with
 * yt-dlp. Concurrent requests for the same URL share one download.
 */
const downloadAudio = (
  url: string,
  onProgress?: ProgressReporter,
): Promise<ArrayBuffer> => {
  const cachePath = cachePathFor(url);
  if (existsSync(cachePath)) {
    return Promise.resolve(toArrayBuffer(readFileSync(cachePath)));
  }

  const existing = inFlightDownloads.get(url);
  if (existing) {
    existing.refs += 1;
    return existing.promise;
  }

  const entry: InFlightDownload = {
    promise: null as unknown as Promise<ArrayBuffer>,
    child: null,
    refs: 1,
    cancelled: false,
  };
  entry.promise = runYtDlp(url, entry, onProgress).finally(() => {
    inFlightDownloads.delete(url);
  });
  inFlightDownloads.set(url, entry);
  return entry.promise;
};

/**
 * Abort an in-flight download when a requester goes away (its sample was
 * removed). Reference-counted so a shared download isn't killed while another
 * sample still needs it.
 */
const cancelDownload = (url: string): void => {
  const entry = inFlightDownloads.get(url);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0 && !entry.cancelled) {
    entry.cancelled = true;
    entry.child?.kill();
  }
};

/** Total size, in bytes, of the on-disk audio cache. */
const cacheUsage = (): number => {
  const dir = cacheDir();
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).reduce((total, name) => {
    try {
      return total + statSync(join(dir, name)).size;
    } catch {
      return total;
    }
  }, 0);
};

/** Wire the renderer's `window.yt.fetchVideo` bridge to yt-dlp. */
export const registerYoutubeDownload = (): void => {
  ipcMain.handle('yt:cache-size', () => cacheUsage());

  ipcMain.handle('yt:clear-cache', () => {
    const freed = cacheUsage();
    rmSync(cacheDir(), { recursive: true, force: true });
    return freed;
  });

  // Abort an in-flight download whose sample was removed before it finished.
  ipcMain.handle('yt:cancel', (_event, url: string) => {
    cancelDownload(url);
  });

  ipcMain.handle('yt:download', async (event, url: string) => {
    const report: ProgressReporter = (phase, progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('yt:download-progress', { url, phase, progress });
      }
    };

    try {
      return await downloadAudio(url, report);
    } finally {
      // Always emit a terminal event so the renderer clears the indicator,
      // whether the download succeeded, hit the cache, or failed.
      report('done', 1);
    }
  });
};
