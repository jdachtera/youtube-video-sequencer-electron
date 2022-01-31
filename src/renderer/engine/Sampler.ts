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
  change: () => void;
}

export class Sampler extends TypedEmitter<SamplerEvents> {
  buffer = new ToneAudioBuffer();

  chains = new Map<string, SliceChain>();

  url: string;

  private hasLoadedPromise: Promise<void>;

  constructor(protected engine: Engine, url: string) {
    super();

    this.url = url;
    this.hasLoadedPromise = this.load();

    this.on('chain-added', () => this.emit('change'));
    this.on('chain-removed', () => this.emit('change'));
  }

  private async load() {
    const sourceUrl = await yt.getYouTubeVideoSource(this.url);

    await this.buffer.load(sourceUrl);
  }

  async hasLoaded() {
    const hasLoaded = await this.hasLoadedPromise;
    return hasLoaded;
  }

  getOrCreateChain(slice: Slice) {
    const maybeExistingChain = this.chains.get(slice.id);
    if (maybeExistingChain) return maybeExistingChain;

    const chain = new SliceChain(this.buffer, slice, this.engine);
    chain.on('slice-updated', () => this.emit('change'));

    this.chains.set(slice.id, chain);
    this.emit('chain-added', chain);
    return chain;
  }

  removeChain(slice: Slice) {
    const maybeExistingChain = this.chains.get(slice.id);
    console.log('removeChain', maybeExistingChain);
    if (maybeExistingChain) {
      maybeExistingChain.dispose();
      maybeExistingChain.removeAllListeners();
      this.chains.delete(slice.id);
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
      slices: [...this.chains.values()].map((chain) => chain.getSlice()),
    };
  }
}
