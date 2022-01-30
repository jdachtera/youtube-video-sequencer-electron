/* eslint-disable max-classes-per-file */
import { Time } from 'tone/build/esm/core/type/Units';
import SubscriptionEventEmitter from './EventEmitter';
import Sampler from './Sampler';
import type { Slice } from '../Slice';

interface EngineEvents {
  'sampler-added': (sampler: Sampler) => void;
  'sampler-removed': (sampler: Sampler) => void;
  change: () => void;
}

export default class Engine extends SubscriptionEventEmitter<EngineEvents> {
  protected samplers = new Map<string, Sampler>();

  public currentPatternIndex: number = 0;

  constructor() {
    super();

    this.on('sampler-added', () => this.emit('change'));
    this.on('sampler-removed', () => this.emit('change'));
  }

  getOrCreateSampler(url: string) {
    const maybeExistingSampler = this.samplers.get(url);
    if (maybeExistingSampler) {
      return maybeExistingSampler;
    }

    const sampler = new Sampler(this, url);
    this.samplers.set(url, sampler);

    sampler.on('change', () => this.emit('change'));
    this.emit('sampler-added', sampler);
    return sampler;
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

  async load({
    samplers,
    currentPatternIndex,
  }: {
    samplers: { url: string; slices: Slice[] }[];
    currentPatternIndex: number;
  }) {
    await Promise.all(
      samplers.map(async ({ url, slices }) => {
        const sampler = this.getOrCreateSampler(url);
        await sampler.hasLoaded();
        slices.forEach((slice) => sampler.getOrCreateChain(slice));
      })
    );
    this.setCurrentPatternIndex(currentPatternIndex);
  }

  serialize() {
    return {
      samplers: [...this.samplers.values()].map((sampler) =>
        sampler.serialize()
      ),
      currentPatternIndex: this.currentPatternIndex,
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
