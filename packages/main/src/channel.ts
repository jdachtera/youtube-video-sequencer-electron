import { BrowserWindow, app, net } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Renderer "channels": which deployment of the web UI the shell loads.
 *
 * The GitHub Pages workflow publishes `main` to the site root and every other
 * branch to `branches/<slug>/`. The shell can load any of them, so the UI can be
 * switched to a branch's preview deployment from inside the app (see the channel
 * picker in the renderer) without reinstalling. The choice is persisted and
 * applied on the next launch too. If the chosen deployment can't be reached we
 * always fall back to the bundled copy, so the app still starts.
 */

const REPO = 'jdachtera/youtube-video-sequencer-electron';
const DEFAULT_CHANNEL = 'main';

// Pages root deployment (= the `main` branch). Empty when no remote renderer is
// configured (local/dev builds) — channel switching is then unavailable.
const baseUrl = (
  process.env.MEGARACK_RENDERER_URL ||
  import.meta.env.VITE_RENDERER_URL ||
  ''
).trim();

/** Origin of the remote renderer, or null when none is configured. */
export const remoteRendererOrigin: string | null = baseUrl
  ? new URL(baseUrl).origin
  : null;

export const hasRemote = (): boolean => baseUrl.length > 0;

// Folder-safe slug for a branch name. MUST match the Pages deploy workflow.
const slug = (branch: string): string =>
  branch.replace(/[^a-zA-Z0-9._-]/g, '-');

const channelFile = (): string => join(app.getPath('userData'), 'channel.json');

export const getChannel = (): string => {
  try {
    const parsed = JSON.parse(readFileSync(channelFile(), 'utf8')) as {
      channel?: string;
    };
    return parsed.channel?.trim() || DEFAULT_CHANNEL;
  } catch {
    return DEFAULT_CHANNEL;
  }
};

const saveChannel = (channel: string): void => {
  try {
    mkdirSync(app.getPath('userData'), { recursive: true });
    writeFileSync(channelFile(), JSON.stringify({ channel }), 'utf8');
  } catch (error) {
    console.warn('[channel] could not persist channel:', error);
  }
};

/** Remote URL for the active channel, or null when no remote is configured. */
export const resolveRendererUrl = (): string | null => {
  if (!baseUrl) return null;
  const channel = getChannel();
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (!channel || channel === DEFAULT_CHANNEL) return root;
  return new URL(`branches/${slug(channel)}/`, root).toString();
};

const bundledUrl = (): string =>
  new URL('../renderer/dist/index.html', 'file://' + __dirname).toString();

/**
 * Force a fresh fetch of the channel's (unhashed) index.html on every load.
 *
 * GitHub Pages serves index.html with a ~10-minute CDN cache, and because the
 * deploy keeps old hashed bundles around (keep_files), a stale index.html keeps
 * working — it still points at bundles that exist — so a redeploy silently shows
 * the *previous* build until the cache expires (a hard reload doesn't help: the
 * staleness is at the CDN edge). A changing query string makes index.html a
 * cache miss so the latest deploy is picked up immediately. The hashed asset
 * URLs it references are content-addressed and still cache normally.
 */
const cacheBusted = (url: string): string => {
  const busted = new URL(url);
  busted.searchParams.set('_', Date.now().toString());
  return busted.toString();
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ]);

/**
 * Whether a deployment actually exists at `url`. A branch the channel picker
 * lists may have no Pages deploy (its preview workflow hasn't run, or it isn't
 * renderer-affecting); GitHub then serves the SPA 404 fallback, whose relative
 * asset URLs resolve under the missing path and fail to load — a white screen.
 * `loadURL` resolves even on an HTTP 404, so it can't detect this; a preflight
 * request can. Anything other than a 2xx means "no live deploy here".
 */
const remoteIsLive = async (url: string): Promise<boolean> => {
  try {
    const response = await withTimeout(net.fetch(url, { method: 'GET' }), 8000);
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Load the renderer into `window`: the Vite dev server in development; otherwise
 * the active remote channel (when a deploy is actually live there) and, if not,
 * the bundled copy. A fresh loadURL supersedes any still-pending remote
 * navigation.
 */
export const loadRenderer = async (window: BrowserWindow): Promise<void> => {
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_SERVER_URL !== undefined
  ) {
    await window.loadURL(import.meta.env.VITE_DEV_SERVER_URL);
    return;
  }

  const remote = resolveRendererUrl();
  if (remote) {
    // Bust the CDN cache once per load; the preflight warms the edge with the
    // fresh response so the subsequent navigation gets the latest deploy too.
    const freshRemote = cacheBusted(remote);
    if (await remoteIsLive(freshRemote)) {
      try {
        await withTimeout(window.loadURL(freshRemote), 8000);
        return;
      } catch (error) {
        console.warn(
          `[renderer] remote load of ${remote} failed; using bundled copy:`,
          error,
        );
      }
    } else {
      console.warn(
        `[renderer] no live deploy at ${remote}; using bundled copy`,
      );
    }
  }

  await window.loadURL(bundledUrl());
};

/** Switch channel and reload the (focused) window. */
export const setChannel = async (channel: string): Promise<void> => {
  saveChannel(channel || DEFAULT_CHANNEL);
  const window =
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (window) await loadRenderer(window);
};

/**
 * Branch names from the GitHub API, for the in-app channel picker. Fetched in
 * the main process so the renderer needs no GitHub network access of its own.
 */
export const listBranches = async (): Promise<string[]> => {
  if (!baseUrl) return [];
  try {
    const response = await net.fetch(
      `https://api.github.com/repos/${REPO}/branches?per_page=100`,
      {
        headers: {
          'User-Agent': 'megarack',
          Accept: 'application/vnd.github+json',
        },
      },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as Array<{ name: string }>;
    return data.map((branch) => branch.name);
  } catch {
    return [];
  }
};
