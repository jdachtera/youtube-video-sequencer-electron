import audioBufferToWav from 'audiobuffer-to-wav';
import { ToneAudioBuffer } from 'tone';

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

export const exportBuffer = (buffer: ToneAudioBuffer, fileName: string) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const wav = audioBufferToWav(buffer.get()!);
  const blob = new window.Blob([new DataView(wav)], {
    type: 'audio/wav',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
