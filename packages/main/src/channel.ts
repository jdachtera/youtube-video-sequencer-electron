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

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ]);

/**
 * Load the renderer into `window`: the Vite dev server in development; otherwise
 * the active remote channel (with an 8s timeout) and, if that fails, the bundled
 * copy. A fresh loadURL supersedes any still-pending remote navigation.
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
    try {
      await withTimeout(window.loadURL(remote), 8000);
      return;
    } catch (error) {
      console.warn(
        `[renderer] remote load of ${remote} failed; using bundled copy:`,
        error,
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
