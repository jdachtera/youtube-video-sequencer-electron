import fileSaver from 'file-saver';
import type { ToneAudioBuffer } from 'tone';
import { encodeWav } from './encodeWav';

type Entry<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T];

type KeyValue<T> = {
  [P in keyof T]: {
    key: P;
    value: T[P];
  };
}[keyof T];

export function keyValueEntries<T extends Record<string, unknown>>(obj: T) {
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value,
  })) as unknown as KeyValue<{
    [key in keyof T]-?: T[key];
  }>[];
}

export function entries<T extends Record<string, unknown>>(obj: T): Entry<T>[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return Object.entries(obj) as any;
}

export type PropertyUpdateEvents<T extends { [key: string]: unknown }> = {
  [K in keyof T as `${K extends string ? K : never}Updated`]: (
    value: T[K],
  ) => void;
};

export const exportBuffer = async (
  audioBuffer: ToneAudioBuffer,
  fileName: string,
  setEncodeProgress?: (progress: number) => void,
) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const encodedWave = await encodeWav(audioBuffer.get()!, setEncodeProgress);
  fileSaver.saveAs(encodedWave, fileName);
};

export function randomColor() {
  const randR = Math.floor(Math.random() * (255 - 0 + 1) + 0);
  const randG = Math.floor(Math.random() * (255 - 0 + 1) + 0);
  const randB = Math.floor(Math.random() * (255 - 0 + 1) + 0);
  const color = `rgba(${randR},${randG},${randB},0.8)`;
  return color;
}

export async function fetchSliceUrlInfo(url: string) {
  if (url.includes('youtube.com')) {
    // The title/cover are best-effort metadata. youtubei.js can fail (YouTube
    // keeps changing its InnerTube endpoints — e.g. a 400 from
    // /youtubei/v1/config), so never let it block the actual audio download,
    // which goes through the separate yt-dlp path.
    let title = '';
    let cover = '';
    try {
      const result = await window.yt.getInfo(url);
      title = result?.basic_info?.title ?? '';
      cover = result?.basic_info?.thumbnail ?? '';
    } catch {
      // Ignore: fall back to a title derived from the URL below.
    }

    const buffer = await window.yt.fetchVideo(url);

    if (!buffer) throw new Error('Download failed');

    if (!title) {
      try {
        title = new URL(url).searchParams.get('v') ?? 'YouTube sample';
      } catch {
        title = 'YouTube sample';
      }
    }

    return {
      title,
      cover,
      buffer,
    };
  }

  if (url.startsWith('http://file.local')) {
    const title = url.split('/').pop()!.split('.').slice(0, -1).join('.');

    return { sourceUrl: url, title, cover: '' };
  }

  return { sourceUrl: url, title: '', cover: '' };
}
