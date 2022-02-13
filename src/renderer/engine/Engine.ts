/* eslint-disable max-classes-per-file */
import { Time } from 'tone/build/esm/core/type/Units';
import { Transport } from 'tone/build/esm/core/clock/Transport';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Sampler } from './Sampler';
import { SerializedEngine, SerializedSampler } from './types';
import { entries } from './helpers';

interface EngineEvents {
  'sampler-added': (sampler: Sampler) => void;
  'sampler-removed': (sampler: Sampler) => void;
  'bpm-updated': (bpm: number) => void;
  'swing-updated': (swing: number) => void;
  'current-pattern-index-updated': (index: number) => void;
  change: () => void;
}

export class Engine extends TypedEmitter<EngineEvents> {
  protected samplers = new Map<string, Sampler>();

  public currentPatternIndex = 0;

  constructor(public transport: Transport) {
    super();

    this.on('sampler-added', () => this.emit('change'));
    this.on('sampler-removed', () => this.emit('change'));
    this.on('bpm-updated', () => this.emit('change'));
    this.on('swing-updated', () => this.emit('change'));
    this.on('current-pattern-index-updated', () => this.emit('change'));
  }

  createSampler(serializedSampler: SerializedSampler) {
    const sampler = new Sampler(this, serializedSampler);
    this.samplers.set(serializedSampler.url, sampler);
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
      maybeExistingSampler.chains.forEach((chain) => {
        maybeExistingSampler.removeChain(chain.id);
      });
      maybeExistingSampler.dispose();
      this.samplers.delete(url);

      this.emit('sampler-removed', maybeExistingSampler);
    }
  }

  dispose() {
    this.samplers.forEach((sampler) => {
      this.removeSampler(sampler.url);
    });
  }

  update(serializedEngine: Partial<SerializedEngine>) {
    console.log(serializedEngine);
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
      this.emit(`${entry[0]}-updated` as any, entry[1]);
    });
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
      sampler.chains.forEach((chain) => chain.sequence.start(time, offset));
    });
  }

  stop(time?: Time | undefined) {
    this.samplers.forEach((sampler) => {
      sampler.chains.forEach((chain) => chain.sequence.stop(time));
    });
  }
}
