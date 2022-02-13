import { Gain, ToneAudioBuffer } from 'tone';
import { TypedEmitter } from 'tiny-typed-emitter';
import { SamplerSlice } from './SamplerSlice';
import type { Engine } from './Engine';
import { SerializedSlice, SerializedSampler } from './types';
import { loadCachedVideo, storeCachedVideo } from './blobStore';
import { entries } from './helpers';

declare const yt: {
  getYouTubeVideoSource: (url: string) => Promise<string>;
};

interface SamplerEvents {
  'chain-added': (chain: SamplerSlice) => void;
  'chain-removed': (chain: SamplerSlice) => void;
  'chain-updated': (chain: SamplerSlice) => void;
  'zoom-updated': (zoom: number) => void;
  'volume-updated': (volume: number) => void;
  'chain-playback-started': () => void;
  load: () => void;
  change: () => void;
}

export class Sampler extends TypedEmitter<SamplerEvents> {
  buffer = new ToneAudioBuffer();

  chains = new Map<string, SamplerSlice>();

  url = '';

  zoom = 1;

  gain = new Gain();

  engine: Engine;

  private _hasLoaded = false;

  constructor(engine: Engine, serializedSampler: SerializedSampler) {
    super();

    this.engine = engine;
    this.gain.toDestination();

    this.on('chain-added', () => this.emit('change'));
    this.on('chain-removed', () => this.emit('change'));
    this.on('chain-updated', () => this.emit('change'));
    this.on('zoom-updated', () => this.emit('change'));
    this.on('volume-updated', () => this.emit('change'));

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
          this.chains.forEach((chain) => this.removeChain(chain.id));
          entry[1]?.forEach((serializedChain) =>
            this.createChain(serializedChain)
          );
          break;
      }

      this.emit(`${entry[0]}-updated` as any, entry[1]);
    });
  }

  createChain(slice: SerializedSlice) {
    const chain = new SamplerSlice(this, slice);

    chain.soloNode.connect(this.gain);
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
    this.chains.forEach((chain) => this.removeChain(chain.id));
    this.buffer.dispose();
  }

  serialize(): SerializedSampler {
    return {
      url: this.url,
      zoom: this.zoom,
      volume: this.gain.gain.value,
      slices: [...this.chains.values()].map((chain) => chain.serialize()),
    };
  }
}
