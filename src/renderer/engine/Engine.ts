/* eslint-disable max-classes-per-file */
import { Time } from 'tone/build/esm/core/type/Units';
import { Transport } from 'tone/build/esm/core/clock/Transport';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Sampler } from './Sampler';
import { SerializedEngine, SerializedSampler } from './types';
import { entries, PropertyUpdateEvents } from './helpers';

type EngineEvents = {
  samplerAdded: (sampler: Sampler) => void;
  samplerRemoved: (sampler: Sampler) => void;
  change: (engine: Engine) => void;
} & PropertyUpdateEvents<SerializedEngine>;

export class Engine extends TypedEmitter<EngineEvents> {
  protected samplers = new Map<string, Sampler>();

  public currentPatternIndex = 0;

  constructor(public transport: Transport) {
    super();

    this.setMaxListeners(1000);

    this.on('samplerAdded', () => this.emit('change', this));
    this.on('samplerRemoved', () => this.emit('change', this));
  }

  createSampler(serializedSampler: SerializedSampler) {
    const sampler = new Sampler(this, serializedSampler);
    this.samplers.set(serializedSampler.url, sampler);
    sampler.on('change', () => this.emit('change', this));
    this.emit('samplerAdded', sampler);

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
      maybeExistingSampler.slices.forEach((slice) => {
        maybeExistingSampler.removeSlice(slice.id);
      });
      maybeExistingSampler.dispose();
      this.samplers.delete(url);

      this.emit('samplerRemoved', maybeExistingSampler);
    }
  }

  dispose() {
    this.samplers.forEach((sampler) => {
      this.removeSampler(sampler.url);
    });
  }

  update(serializedEngine: Partial<SerializedEngine>) {
    entries(serializedEngine).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'bpm':
          this.transport.bpm.value = entry[1] ?? 120;
          break;
        case 'currentPatternIndex':
          this.currentPatternIndex = entry[1] ?? 0;
          this.samplers.forEach((sampler) => {
            sampler.setCurrentPatternIndex(this.currentPatternIndex);
          });
          break;
        case 'swing':
          this.transport.swing = entry[1] ?? 0;
          this.transport.swingSubdivision = '16n';
          break;
        case 'samplers':
          this.samplers.forEach((sampler) => this.removeSampler(sampler.url));
          entry[1]?.forEach((serializedSampler) =>
            this.createSampler(serializedSampler)
          );
          break;
      }
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });
    this.emit('change', this);
  }

  serialize(): SerializedEngine {
    return {
      samplers: [...this.samplers.values()].map((sampler) =>
        sampler.serialize()
      ),
      currentPatternIndex: this.currentPatternIndex,
      bpm: this.transport.bpm.value,
      swing: this.transport.swing,
    };
  }

  start(time?: Time | undefined, offset?: number | undefined) {
    this.samplers.forEach((sampler) => {
      sampler.slices.forEach((slice) => slice.sequence.start(time, offset));
    });
  }

  stop(time?: Time | undefined) {
    this.samplers.forEach((sampler) => {
      sampler.slices.forEach((slice) => slice.sequence.stop(time));
    });
  }
}
