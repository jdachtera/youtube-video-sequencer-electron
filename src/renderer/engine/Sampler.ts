import { ToneAudioBuffer } from 'tone';
import { TypedEmitter } from 'tiny-typed-emitter';
import type { Engine } from './Engine';
import type { Slice } from '../Slice';
import { SliceChain } from './SliceChain';

declare const yt: {
  getYouTubeVideoSource: (url: string) => Promise<string>;
};

interface SamplerEvents {
  'chain-added': (chain: SliceChain) => void;
  'chain-removed': (chain: SliceChain) => void;
  'chain-updated': (chain: SliceChain) => void;
  change: () => void;
}

export class Sampler extends TypedEmitter<SamplerEvents> {
  buffer = new ToneAudioBuffer();

  chains = new Map<string, SliceChain>();

  url: string;

  zoom: number;

  protected engine: Engine;

  private hasLoadedPromise: Promise<void>;

  constructor({
    engine,
    url,
    zoom,
    slices,
  }: {
    engine: Engine;
    url: string;
    zoom: number;
    slices: Slice[];
  }) {
    super();

    this.url = url;
    this.zoom = zoom;
    this.engine = engine;

    this.hasLoadedPromise = this.load();

    this.addSlicesWhenLoaded(slices);

    this.on('chain-added', () => this.emit('change'));
    this.on('chain-removed', () => this.emit('change'));
    this.on('chain-updated', () => this.emit('change'));
  }

  protected async addSlicesWhenLoaded(slices: Slice[]) {
    await this.hasLoaded();
    slices.forEach((slice) => {
      this.createChain(slice);
    });
  }

  private async load() {
    const sourceUrl = await yt.getYouTubeVideoSource(this.url);

    await this.buffer.load(sourceUrl);
  }

  async hasLoaded() {
    const hasLoaded = await this.hasLoadedPromise;
    return hasLoaded;
  }

  createChain(slice: Slice) {
    const chain = new SliceChain(this.buffer, this.engine, slice);
    chain.on('chain-updated', (updatedChain) => {
      this.emit('chain-updated', updatedChain);
    });

    this.chains.set(slice.id, chain);
    this.emit('chain-added', chain);
  }

  getChains() {
    return [...this.chains.values()];
  }

  getChain(id: string) {
    return this.chains.get(id);
  }

  removeChain(id: string) {
    const maybeExistingChain = this.chains.get(id);
    console.log('removeChain', maybeExistingChain);
    if (maybeExistingChain) {
      maybeExistingChain.dispose();
      maybeExistingChain.removeAllListeners();
      this.chains.delete(id);
      this.emit('chain-removed', maybeExistingChain);
    }
  }

  stop() {
    this.chains.forEach((chain) => chain.stop());
  }

  dispose() {
    this.chains.forEach((chain) => chain.dispose());
    this.buffer.dispose();
  }

  serialize() {
    return {
      url: this.url,
      zoom: this.zoom,
      slices: [...this.chains.values()].map((chain) => chain.getSlice()),
    };
  }
}
