import { createSignal } from 'solid-js';

export type DownloadPhase = 'binary' | 'audio' | 'done';

export type DownloadProgress = {
  url: string;
  phase: DownloadPhase;
  progress: number;
};

const [downloads, setDownloads] = createSignal<DownloadProgress[]>([]);

export { downloads };

/**
 * Apply a progress update from the main process. A `done` event (or progress >=
 * 1) removes the entry so the indicator disappears when the download finishes,
 * hits the cache, or fails.
 */
export const updateDownload = (progress: DownloadProgress) => {
  setDownloads((current) => {
    const rest = current.filter((download) => download.url !== progress.url);
    if (progress.phase === 'done' || progress.progress >= 1) return rest;
    return [...rest, progress];
  });
};
