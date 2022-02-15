import { ToneAudioBuffer } from 'tone';
import { SerializedSlice, Slice } from './Slice';
import type { Engine } from '../Engine';

import { loadCachedVideo, storeCachedVideo } from '../blobStore';
import { entries, PropertyUpdateEvents } from '../helpers';
import { Device, SerializedDeviceBase } from './Device';
import { DeepPartial } from '../types';

declare const yt: {
  getYouTubeVideoSource: (url: string) => Promise<string>;
};

export type SerializedSampler = SerializedDeviceBase & {
  name: 'Sampler';
  url: string;
  zoom: number;
  slices: SerializedSlice[];
};

type SamplerEvents = {
  sliceAdded: (slice: Slice) => void;
  sliceRemoved: (slice: Slice) => void;
  sliceUpdated: (slice: Slice) => void;
  slicePlaybackStarted: () => void;
  load: () => void;
  change: (sampler: Sampler) => void;
} & PropertyUpdateEvents<SerializedSampler>;

export class Sampler extends Device<SamplerEvents> {
  name = 'Sampler';

  buffer = new ToneAudioBuffer();

  slices = new Map<string, Slice>();

  url = '';

  zoom = 1;

  private _hasLoaded = false;

  static normalizeData = (
    sampler: DeepPartial<SerializedSampler>
  ): SerializedSampler => ({
    name: 'Sampler',
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

  constructor(engine: Engine, serializedSampler: SerializedSampler) {
    super(engine);
    this.setMaxListeners(1000);

    this.on('sliceAdded', this.emitChange);
    this.on('sliceRemoved', this.emitChange);

    this.update(serializedSampler);
  }

  emitChange = () => this.emit('change', this);

  private async load() {
    this._hasLoaded = false;

    const cachedBlob = await loadCachedVideo(this.url);

    if (cachedBlob) {
      this.buffer.fromArray(cachedBlob);
    } else {
      const sourceUrl = await yt.getYouTubeVideoSource(this.url);
      await this.buffer.load(sourceUrl);
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

  update(samplerPartial: Partial<SerializedSampler>) {
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
        case 'slices':
          this.slices.forEach((slice) => this.removeSlice(slice.id));
          entry[1]?.forEach((serializedSlice) =>
            this.createSlice(serializedSlice)
          );
          break;
      }

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

  removeSlice(id: string) {
    const maybeExistingSlice = this.slices.get(id);

    if (maybeExistingSlice) {
      maybeExistingSlice.dispose();
      maybeExistingSlice.removeAllListeners();
      this.slices.delete(id);
      this.emit('sliceRemoved', maybeExistingSlice);
    }
  }

  setCurrentPatternIndex(index: number) {
    this.slices.forEach((slice) => slice.setCurrentPatternIndex(index));
  }

  stop() {
    this.slices.forEach((slice) => slice.stop());
  }

  dispose() {
    super.dispose();
    this.slices.forEach((slice) => this.removeSlice(slice.id));
    this.buffer.dispose();
  }

  serialize(): SerializedSampler {
    return {
      name: 'Sampler',
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      url: this.url,
      zoom: this.zoom,
      slices: [...this.slices.values()].map((slice) => slice.serialize()),
    };
  }
}
