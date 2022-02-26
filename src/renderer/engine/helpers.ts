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
