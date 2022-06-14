import { batch } from 'solid-js';
import { getContext, ToneAudioBuffer } from 'tone';
import type { Engine } from '../Engine';
import { EngineBase } from '../EngineBase';
import { loadCachedVideo, storeCachedVideo } from '../blobStore';
import type { PropertyUpdateEvents } from '../helpers';
import { entries, fetchSliceUrlInfo } from '../helpers';
import { loadFileAsBuffer, resolveFileUrl } from '../localFile';
import type { DeepPartial } from '../types';
import type { Device } from './Device';
import type { Slice } from './Slice';

export type SerializedSampler = {
  name: 'Sampler';
  title: string;
  url: string;
  zoom: number;
  position: number;
};

type SamplerDeviceEvents = {
  sliceAdded: (slice: Slice) => void;
  sliceRemoved: (slice: Slice) => void;
  sliceUpdated: (slice: Slice) => void;
  sliceSelected: (slice?: Slice) => void;
  load: () => void;
  change: (sampler: SamplerDevice) => void;
} & PropertyUpdateEvents<SerializedSampler>;

export class SamplerDevice extends EngineBase<SamplerDeviceEvents> {
  name = 'Sampler';
  buffer = new ToneAudioBuffer();
  slices: Slice[] = [];
  url = '';
  zoom = 1;
  position = 0;
  title = '';
  selectedSlice?: Slice;

  private isLoading = false;

  private _hasLoaded = false;

  static normalizeData = (
    sampler: DeepPartial<SerializedSampler>,
  ): SerializedSampler => ({
    name: 'Sampler',

    title: sampler.title ?? '',
    url: sampler.url ?? '',
    position: sampler.position ?? 0,
    zoom: sampler.zoom ?? 1,
  });

  constructor(public engine: Engine, serializedSampler: SerializedSampler) {
    super();
    this.setMaxListeners(1000);

    this.on('sliceAdded', this.emitChange);
    this.on('sliceRemoved', this.emitChange);
    this.set(serializedSampler);
  }

  emitChange = () => this.emit('change', this);

  private async load() {
    console.log('load');
    this.isLoading = true;
    this._hasLoaded = false;

    if (this.url.startsWith('http://file.local')) {
      const file = await resolveFileUrl(this.url);
      if (file) {
        const arrayBuffer = await loadFileAsBuffer(file);
        const audioBuffer = await getContext().decodeAudioData(arrayBuffer);

        this.buffer.set(audioBuffer);
      }
    } else {
      const cachedBlob = await loadCachedVideo(this.url);

      if (cachedBlob) {
        this.buffer.fromArray(cachedBlob);
      } else {
        const base64StringOrBuffer = await this.loadArrayBuffer();

        const arrayBuffer =
          typeof base64StringOrBuffer === 'string'
            ? base64ToArrayBuffer(base64StringOrBuffer)
            : base64StringOrBuffer;

        const audioBuffer = await getContext().decodeAudioData(arrayBuffer);
        this.buffer.set(audioBuffer);

        await storeCachedVideo(this.url, this.buffer.toArray());
      }
    }

    this.emit('load');
    this.isLoading = false;
    this._hasLoaded = true;
  }

  hasLoaded = async () => {
    if (this._hasLoaded) return;

    if (!this.isLoading) this.load();

    await new Promise<void>((resolve) =>
      this.once('load', () => {
        resolve();
      }),
    );
  };

  private async loadArrayBuffer() {
    const { sourceUrl, title } = await fetchSliceUrlInfo(this.url);
    this.set({ title });
    return await window.yt.fetchVideo(sourceUrl);
  }

  set(samplerPartial: Partial<SerializedSampler>) {
    batch(() => {
      entries(samplerPartial).forEach((entry) => {
        if (!entry) return;
        switch (entry[0]) {
          case 'url':
            this.url = entry[1] ?? '';
            break;
          case 'zoom':
            this.zoom = entry[1] ?? 1;
            break;
          case 'position':
            this.position = entry[1] ?? 0;
            break;
          case 'title':
            this.title = entry[1] ?? '';
            break;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.emit(`${entry[0]}Updated` as any, entry[1]);
      });
    });
  }

  emitSliceUpdated = (slice: Slice) => {
    this.emit('sliceUpdated', slice);
  };

  findSlice(id: string) {
    return this.slices.find((slice) => slice.id === id);
  }

  addSlice(slice: Slice) {
    this.slices = [...this.slices, slice];
    this.emit('sliceAdded', slice);
    slice.on('change', (device: Device) =>
      this.emitSliceUpdated(device as Slice),
    );
  }

  selectSlice(slice: Slice) {
    this.selectedSlice = slice;
    this.emit('sliceSelected', slice);
  }

  removeSlice(slice: Slice) {
    this.slices = this.slices.filter((s) => s !== slice);
    this.emit('sliceRemoved', slice);
  }

  stop() {
    this.slices.forEach((slice) => slice.stop());
  }

  unload() {
    this.buffer.dispose();
    this.buffer = new ToneAudioBuffer();
    this._hasLoaded = false;
    this.isLoading = false;
  }

  dispose() {
    this.buffer.dispose();
  }

  serialize(): SerializedSampler {
    return {
      name: 'Sampler',
      title: this.title,
      url: this.url,
      zoom: this.zoom,
      position: this.position,
    };
  }
}
function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
