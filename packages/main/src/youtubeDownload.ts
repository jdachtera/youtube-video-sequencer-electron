import { app, ipcMain, net } from 'electron';
import { spawn } from 'node:child_process';
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
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

let ensurePromise: Promise<string> | null = null;

/**
 * Download the yt-dlp binary into userData/bin on first use. Electron's `net`
 * stack follows redirects and honours the system proxy and certificate store,
 * unlike a raw `https` request.
 */
const ensureBinary = (): Promise<string> => {
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

      const file = createWriteStream(dest);
      response.on('data', (chunk) => file.write(chunk));
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

/**
 * Download the best audio-only stream for a YouTube URL and return its bytes.
 * The stream is written to a temp directory (robust across container formats)
 * and read back as an ArrayBuffer for the renderer's Web Audio decoder.
 */
const downloadAudio = async (url: string): Promise<ArrayBuffer> => {
  const binary = await ensureBinary();
  const workDir = mkdtempSync(join(tmpdir(), 'yvs-yt-'));

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(binary, [
        '--no-playlist',
        '--no-warnings',
        '--no-progress',
        '-f',
        'bestaudio[ext=m4a]/bestaudio',
        '-o',
        join(workDir, 'audio.%(ext)s'),
        url,
      ]);

      let stderr = '';
      child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `yt-dlp exited with code ${code}: ${stderr.trim().slice(-300)}`,
            ),
          );
      });
    });

    const [file] = readdirSync(workDir);
    if (!file) throw new Error('yt-dlp produced no output file');

    const buffer = readFileSync(join(workDir, file));
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
};

/** Wire the renderer's `window.yt.fetchVideo` bridge to yt-dlp. */
export const registerYoutubeDownload = (): void => {
  ipcMain.handle('yt:download', (_event, url: string) => downloadAudio(url));
};
