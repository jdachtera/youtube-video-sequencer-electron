import { Gain, ToneAudioBuffer } from 'tone';
import { TypedEmitter } from 'tiny-typed-emitter';
import { SliceChain } from './SliceChain';
import type { Engine } from './Engine';
import type { Slice } from '../Slice';

declare const yt: {
  getYouTubeVideoSource: (url: string) => Promise<string>;
};

interface SamplerEvents {
  'chain-added': (chain: SliceChain) => void;
  'chain-removed': (chain: SliceChain) => void;
  'chain-updated': (chain: SliceChain) => void;
  'zoom-updated': (zoom: number) => void;
  'volume-updated': (volume: number) => void;
  change: () => void;
}

export class Sampler extends TypedEmitter<SamplerEvents> {
  buffer = new ToneAudioBuffer();

  chains = new Map<string, SliceChain>();

  url: string;

  zoom: number;

  gain = new Gain();

  protected engine: Engine;

  private hasLoadedPromise: Promise<void>;

  constructor({
    engine,
    url,
    zoom,
    volume = 1,
    slices,
  }: {
    engine: Engine;
    url: string;
    zoom: number;
    volume?: number;
    slices: Slice[];
  }) {
    super();

    this.url = url;
    this.zoom = zoom;
    this.engine = engine;

    this.gain.toDestination();
    this.gain.gain.value = volume;

    this.hasLoadedPromise = this.load();

    this.addSlicesWhenLoaded(slices);

    this.on('chain-added', () => this.emit('change'));
    this.on('chain-removed', () => this.emit('change'));
    this.on('chain-updated', () => this.emit('change'));
    this.on('zoom-updated', () => this.emit('change'));
    this.on('volume-updated', () => this.emit('change'));
  }

  protected async addSlicesWhenLoaded(slices: Slice[]) {
    await this.hasLoaded();
    slices.forEach((slice) => {
      this.createChain(slice);
    });
  }

  private async load() {
    let sourceUrl;
    try {
      sourceUrl = await yt.getYouTubeVideoSource(this.url);
    } catch (e) {
      console.dir(e);
      throw e;
    }

    await this.buffer.load(sourceUrl);
  }

  async hasLoaded() {
    const hasLoaded = await this.hasLoadedPromise;
    return hasLoaded;
  }

  createChain(slice: Slice) {
    const chain = new SliceChain(this, slice);

    chain.solo.connect(this.gain);
    chain.on('chain-updated', (updatedChain) => {
      this.emit('chain-updated', updatedChain);
    });

    this.chains.set(slice.id, chain);
    this.emit('chain-added', chain);
    return chain;
  }

  getChains() {
    return [...this.chains.values()];
  }

  getChain(id: string) {
    return this.chains.get(id);
  }

  removeChain(id: string) {
    const maybeExistingChain = this.chains.get(id);

    if (maybeExistingChain) {
      maybeExistingChain.dispose();
      maybeExistingChain.removeAllListeners();
      this.chains.delete(id);
      this.emit('chain-removed', maybeExistingChain);
    }
  }

  setCurrentPatternIndex(index: number) {
    this.chains.forEach((chain) => chain.setCurrentPatternIndex(index));
  }

  stop() {
    this.chains.forEach((chain) => chain.stop());
  }

  dispose() {
    this.chains.forEach((chain) => chain.dispose());
    this.buffer.dispose();
  }

  getEngine() {
    return this.engine;
  }

  setVolume(volume: number) {
    this.gain.gain.value = volume;
    this.emit('volume-updated', volume);
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
    this.emit('zoom-updated', zoom);
  }

  serialize() {
    return {
      url: this.url,
      zoom: this.zoom,
      volume: this.gain.gain.value,
      slices: [...this.chains.values()].map((chain) => chain.getSlice()),
    };
  }
}
