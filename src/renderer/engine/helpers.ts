import { ToneAudioBuffer } from 'tone';
import { encodeWav } from './encodeWav';

import fileSaver from 'file-saver';

type Entry<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T];

export function entries<T>(obj: T): Entry<T>[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return Object.entries(obj) as any;
}

export type PropertyUpdateEvents<T extends { [key: string]: unknown }> = {
  [K in keyof T as `${K extends string ? K : never}Updated`]: (
    value: T[K]
  ) => void;
};

export const exportBuffer = async (
  audioBuffer: ToneAudioBuffer,
  fileName: string,
  setEncodeProgress?: (progress: number) => void
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
    const result = await window.yt.getInfo(url);

    const audioTracks = result.formats.filter(
      (entry) => !entry.hasVideo && entry.hasAudio
    );

    const sourceFormat = audioTracks
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .sort((a, b) => (a.audioBitrate! > b.audioBitrate! ? 1 : -1))
      .shift();

    const title = result.videoDetails.title;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sourceUrl = sourceFormat!.url;

    return { sourceUrl, title };
  }

  return { sourceUrl: url, title: '' };
}
