/* eslint-disable max-classes-per-file */
import { Time } from 'tone/build/esm/core/type/Units';
import { Transport } from 'tone/build/esm/core/clock/Transport';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Sampler } from './Sampler';
import type { Slice } from '../Slice';

interface EngineEvents {
  'sampler-added': (sampler: Sampler) => void;
  'sampler-removed': (sampler: Sampler) => void;
  'bpm-updated': (bpm: number) => void;
  'swing-updated': (swing: number) => void;
  change: () => void;
}

export class Engine extends TypedEmitter<EngineEvents> {
  protected samplers = new Map<string, Sampler>();

  public currentPatternIndex: number = 0;

  public bpm: number = 120;

  public swing: number = 0;

  constructor(protected transport: Transport) {
    super();

    this.on('sampler-added', () => this.emit('change'));
    this.on('sampler-removed', () => this.emit('change'));
  }

  createSampler({
    url,
    zoom,
    slices,
  }: {
    url: string;
    zoom: number;
    slices: Slice[];
  }) {
    const sampler = new Sampler({ engine: this, url, zoom, slices });
    this.samplers.set(url, sampler);

    sampler.on('change', () => this.emit('change'));
    this.emit('sampler-added', sampler);
    return sampler;
  }

  getSamplers() {
    return [...this.samplers.values()];
  }

  getSampler(url: string) {
    return this.samplers.get(url);
  }

  removeSampler(url: string) {
    const maybeExistingSampler = this.samplers.get(url);
    if (maybeExistingSampler) {
      maybeExistingSampler.removeAllListeners();
      this.samplers.delete(url);

      this.emit('sampler-removed', maybeExistingSampler);
    }
  }

  setCurrentPatternIndex(index: number) {
    this.currentPatternIndex = index;
    this.samplers.forEach((sampler) => {
      sampler.chains.forEach((chain) => chain.updateSequence());
    });
  }

  setSwing(swing: number) {
    this.swing = swing;
    this.transport.swing = swing;
    this.emit('swing-updated', swing);
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    this.transport.bpm.value = bpm * 2;
    this.emit('bpm-updated', bpm);
  }

  async load({
    samplers,
    bpm = 120,
    swing = 0,
    currentPatternIndex,
  }: {
    samplers: { url: string; slices?: Slice[]; zoom?: number }[];
    bpm: number;
    swing: number;
    currentPatternIndex: number;
  }) {
    samplers.forEach(({ url, slices = [], zoom = 0 }) => {
      this.createSampler({ url, slices, zoom });
    });

    this.setSwing(swing);
    this.setBpm(bpm);
    this.setCurrentPatternIndex(currentPatternIndex);
  }

  serialize() {
    return {
      samplers: [...this.samplers.values()].map((sampler) =>
        sampler.serialize()
      ),
      currentPatternIndex: this.currentPatternIndex,
      bpm: this.bpm,
      swing: this.swing,
    };
  }

  start(time?: Time | undefined, offset?: number | undefined) {
    this.samplers.forEach((sampler) => {
      sampler.chains.forEach((chain) =>
        chain.getSequence().start(time, offset)
      );
    });
  }

  stop(time?: Time | undefined, offset?: number | undefined) {
    this.samplers.forEach((sampler) => {
      sampler.chains.forEach((chain) => chain.getSequence().stop());
    });
  }
}
