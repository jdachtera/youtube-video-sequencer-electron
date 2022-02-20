import { getContext, ToneAudioBuffer } from 'tone';
import { SerializedSlice, Slice } from './Slice';
import type { Engine } from '../Engine';

import { loadCachedVideo, storeCachedVideo } from '../blobStore';
import { entries, PropertyUpdateEvents } from '../helpers';
import { Device, SerializedDeviceBase } from './Device';
import { DeepPartial } from '../types';

export type SerializedSamplerDevice = SerializedDeviceBase & {
  name: 'Sampler';
  title: string;
  url: string;
  zoom: number;
  slices: SerializedSlice[];
};

type SamplerDeviceEvents = {
  sliceAdded: (slice: Slice) => void;
  sliceRemoved: (slice: Slice) => void;
  sliceUpdated: (slice: Slice) => void;
  slicePlaybackStarted: () => void;
  sliceSelected: (slice?: Slice) => void;
  load: () => void;
  change: (sampler: SamplerDevice) => void;
} & PropertyUpdateEvents<SerializedSamplerDevice>;

export class SamplerDevice extends Device<SamplerDeviceEvents> {
  name = 'Sampler';
  buffer = new ToneAudioBuffer();
  slices = new Map<string, Slice>();
  url = '';
  zoom = 1;
  title = '';
  selectedSlice?: Slice;

  private _hasLoaded = false;

  static normalizeData = (
    sampler: DeepPartial<SerializedSamplerDevice>
  ): SerializedSamplerDevice => ({
    name: 'Sampler',
    collapsed: sampler.collapsed ?? false,
    color: 'gray',
    title: sampler.title ?? '',
    inputGain: sampler.inputGain ?? 1,
    volume: sampler.volume ?? 1,
    url: sampler.url ?? '',
    zoom: sampler.zoom ?? 0,
    slices: (Array.isArray(sampler.slices) ? sampler.slices : [])
      .filter(
        (maybeStep): maybeStep is DeepPartial<SerializedSlice> => !!maybeStep
      )
      .map(Slice.normalizeData),
  });

  constructor(engine: Engine, serializedSampler: SerializedSamplerDevice) {
    super(engine);
    this.setMaxListeners(1000);

    this.on('sliceAdded', this.emitChange);
    this.on('sliceRemoved', this.emitChange);

    this.engine.on('currentPatternIndexUpdated', this.setCurrentPatternIndex);

    this.set(serializedSampler);
  }

  emitChange = () => this.emit('change', this);

  private async load() {
    this._hasLoaded = false;

    const cachedBlob = await loadCachedVideo(this.url);

    if (cachedBlob) {
      this.buffer.fromArray(cachedBlob);
    } else {
      const { sourceUrl, title } = await window.yt.getYouTubeVideoMeta(
        this.url
      );
      this.set({ title });

      const base64StringOrBuffer = await window.yt.fetchVideo(sourceUrl);
      const arrayBuffer =
        typeof base64StringOrBuffer === 'string'
          ? base64ToArrayBuffer(base64StringOrBuffer)
          : base64StringOrBuffer;

      const audioBuffer = await getContext().decodeAudioData(arrayBuffer);
      this.buffer.set(audioBuffer);

      await storeCachedVideo(this.url, this.buffer.toArray());
    }

    this.emit('load');
    this._hasLoaded = true;
  }

  hasLoaded = async () => {
    if (this._hasLoaded) return;

    await new Promise<void>((resolve) =>
      this.once('load', () => {
        resolve();
      })
    );
  };

  set(samplerPartial: Partial<SerializedSamplerDevice>) {
    entries(samplerPartial).forEach((entry) => {
      if (!entry) return;
      switch (entry[0]) {
        case 'url':
          this.url = entry[1] ?? '';
          this.load();
          break;
        case 'zoom':
          this.zoom = entry[1] ?? 1;
          break;
        case 'title':
          this.title = entry[1] ?? '';
          break;
        case 'slices':
          this.slices.forEach((slice) => this.removeSlice(slice));
          entry[1]?.forEach((serializedSlice) =>
            this.createSlice(serializedSlice)
          );
          break;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(samplerPartial);
  }

  createSlice(serializedSlice: SerializedSlice) {
    const slice = new Slice(this, serializedSlice);

    slice.soloNode.connect(this.output);
    slice.on('change', this.emitChange);

    this.slices.set(serializedSlice.id, slice);
    this.emit('sliceAdded', slice);
    return serializedSlice;
  }

  getSlices() {
    return [...this.slices.values()];
  }

  getSlice(id: string) {
    return this.slices.get(id);
  }

  selectSlice(slice: Slice) {
    this.selectedSlice = slice;
    this.emit('sliceSelected', slice);
  }

  removeSlice(slice: Slice) {
    slice.dispose();
    slice.removeAllListeners();
    this.slices.delete(slice.id);
    this.emit('sliceRemoved', slice);
  }

  setCurrentPatternIndex = (index: number) => {
    this.slices.forEach((slice) => slice.setCurrentPatternIndex(index));
  };

  stop() {
    this.slices.forEach((slice) => slice.stop());
  }

  dispose() {
    super.dispose();
    this.slices.forEach((slice) => this.removeSlice(slice));
    this.engine.on('currentPatternIndexUpdated', this.setCurrentPatternIndex);
    this.buffer.dispose();
  }

  serialize(): SerializedSamplerDevice {
    return {
      name: 'Sampler',
      collapsed: this.collapsed,
      color: this.color,
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      title: this.title,
      url: this.url,
      zoom: this.zoom,
      slices: [...this.slices.values()].map((slice) => slice.serialize()),
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
