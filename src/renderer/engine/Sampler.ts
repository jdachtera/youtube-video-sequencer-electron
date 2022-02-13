import { Gain, ToneAudioBuffer } from 'tone';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Slice } from './Slice';
import type { Engine } from './Engine';
import { SerializedSlice, SerializedSampler } from './types';
import { loadCachedVideo, storeCachedVideo } from './blobStore';
import { entries, PropertyUpdateEvents } from './helpers';

declare const yt: {
  getYouTubeVideoSource: (url: string) => Promise<string>;
};

type SamplerEvents = {
  sliceAdded: (slice: Slice) => void;
  sliceRemoved: (slice: Slice) => void;
  sliceUpdated: (slice: Slice) => void;
  slicePlaybackStarted: () => void;
  load: () => void;
  change: (sampler: Sampler) => void;
} & PropertyUpdateEvents<SerializedSampler>;

export class Sampler extends TypedEmitter<SamplerEvents> {
  buffer = new ToneAudioBuffer();

  slices = new Map<string, Slice>();

  url = '';

  zoom = 1;

  gain = new Gain();

  engine: Engine;

  private _hasLoaded = false;

  constructor(engine: Engine, serializedSampler: SerializedSampler) {
    super();
    this.setMaxListeners(1000);

    this.engine = engine;
    this.gain.toDestination();

    this.on('sliceAdded', () => this.emit('change', this));
    this.on('sliceRemoved', () => this.emit('change', this));

    this.update(serializedSampler);
  }

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
        case 'volume':
          this.gain.gain.value = entry[1] ?? 1;
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
  }

  createSlice(serializedSlice: SerializedSlice) {
    const slice = new Slice(this, serializedSlice);

    slice.soloNode.connect(this.gain);
    slice.on('change', () => this.emit('change', this));

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
    this.slices.forEach((slice) => this.removeSlice(slice.id));
    this.buffer.dispose();
  }

  serialize(): SerializedSampler {
    return {
      url: this.url,
      zoom: this.zoom,
      volume: this.gain.gain.value,
      slices: [...this.slices.values()].map((slice) => slice.serialize()),
    };
  }
}
