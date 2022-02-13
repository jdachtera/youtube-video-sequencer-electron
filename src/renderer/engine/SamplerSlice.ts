import {
  Gain,
  getDraw,
  Player,
  Sequence,
  Solo,
  Time,
  ToneAudioBuffer,
  Transport,
} from 'tone';
import { TypedEmitter } from 'tiny-typed-emitter';

import type { Step } from '../SequencerStep';
import { Pattern, SerializedSlice } from './types';
import { entries } from './helpers';
import { debounce } from 'ts-debounce';
import { Sampler } from './Sampler';

export interface SamplerSliceEvents {
  'sequence-event': (step: Step) => void;
  'player-started': () => void;
  'player-stopped': () => void;
  load: () => void;

  'playback-speed-updated': (playbackSpeed: number) => void;
  'chain-updated': (updatedChain: SamplerSlice) => void;
  'volume-updated': (volume: number) => void;
  'start-updated': (start: number) => void;
  'end-updated': (end: number) => void;
  'reverse-updated': (reverse: number) => void;
  'color-updated': (color: string) => void;
  'patterns-updated': (patterns: Pattern[]) => void;
  'name-updated': (name: string) => void;
  'gain-updated': (gain: number) => void;
}

export class SamplerSlice extends TypedEmitter<SamplerSliceEvents> {
  player = new Player();
  sequence: Sequence<Step> = null!;

  id = '';
  start = 0;
  end = 1;
  reverse = false;
  color = 'red';
  patterns: Pattern[] = [];
  name = '';
  collapsed = false;

  gainNode = new Gain();
  soloNode = new Solo();

  constructor(public sampler: Sampler, serializedChain: SerializedSlice) {
    super();

    this.player.connect(this.gainNode);
    this.gainNode.connect(this.soloNode);

    this.on('start-updated', this.updateBuffer);
    this.on('end-updated', this.updateBuffer);

    this.update(serializedChain);
  }

  protected onSequenceEvent = (time: number, step: Step) => {
    getDraw().schedule(() => {
      this.emit('sequence-event', step);
    }, time);

    for (let i = 0; i < step.actions.length; i += 1) {
      const action = step.actions[i];

      switch (action.type) {
        case 'PLAY': {
          this.play(time);
          break;
        }
        case 'PAUSE':
          this.player.stop(time);
          break;
        case 'SET_PLAYBACK_SPEED':
          this.player.playbackRate = action.value;
          break;
        case 'SET_REVERSE':
          this.player.reverse = action.value;
          break;
        default:
          break;
      }
    }
  };

  protected getCurrentPattern(patterns: Pattern[]) {
    return patterns?.[this.sampler.engine.currentPatternIndex];
  }

  protected updateSequence() {
    const pattern = this.getCurrentPattern(this.patterns);

    const subdivision = Time(
      `${pattern.subdivision}${pattern.subdivisionType}`
    ).toSeconds();

    if (this.sequence && subdivision === this.sequence.subdivision) {
      this.sequence.events = pattern.steps;
    } else {
      if (this.sequence) {
        this.sequence.clear();
        this.sequence.stop();
        this.sequence.dispose();
      }

      this.sequence = new Sequence({
        callback: this.onSequenceEvent,
        events: pattern?.steps ?? [],
        subdivision: `${pattern?.subdivision ?? 16}${
          pattern?.subdivisionType ?? 'n'
        }`,
      }).start(0, Transport.progress);
    }
  }

  update(slicePartial: Partial<SerializedSlice>) {
    entries(slicePartial).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'volume':
          this.gainNode.gain.value = entry[1] ?? 1;
          break;
        case 'playbackSpeed':
          this.player.playbackRate = entry[1] ?? 1;
          break;
        case 'reverse':
          this.player.reverse = entry[1] ?? false;
          break;
        case 'solo':
          this.soloNode.solo = entry[1] ?? false;
          break;
        case 'patterns': {
          this.patterns = this.ensurePatternExists(
            entry[1] ?? [],
            this.sampler.engine.currentPatternIndex
          );

          this.updateSequence();
          break;
        }
        case 'start':
        case 'end':
          this[entry[0]] = entry[1] ?? 0;
          break;
        case 'color':
          this.name = entry[1] ?? '';
          break;
        case 'collapsed':
          this.collapsed = entry[1] ?? false;
          break;
        default:
      }

      this.emit(`${entry[0]}-updated` as any, entry[1]);
    });

    this.emit('chain-updated', this);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateBuffer = debounce(async (..._args: unknown[]) => {
    await this.sampler.hasLoaded();

    const { buffer } = this.sampler;

    const start = Math.max(this.start, 0);
    const end = Math.min(this.end, buffer.length);

    const slicedBuffer =
      start < end ? buffer.slice(start, end) : new ToneAudioBuffer();

    this.player.buffer.set(slicedBuffer);
    this.emit('load');
  }, 1);

  ensurePatternExists(patterns: Pattern[], index: number) {
    const missingNumberOfPatterns = Math.max(index + 1 - patterns.length, 0);

    if (missingNumberOfPatterns === 0) return patterns;

    return [
      ...patterns,
      ...Array.from({ length: missingNumberOfPatterns }).map(() =>
        createEmptyPattern()
      ),
    ];
  }

  updatePattern(patternIndex: number, pattern: Partial<Pattern>) {
    const updatedPattern = { ...this.patterns[patternIndex], ...pattern };
    const updatedPatterns = [
      ...this.patterns.slice(0, patternIndex),
      updatedPattern,
      ...this.patterns.slice(patternIndex + 1),
    ];

    this.update({ patterns: updatedPatterns });
  }

  updatePatternLength(patternIndex: number, newLength: number) {
    const { steps } = this.patterns[patternIndex];

    const updatedSteps = [
      ...steps.slice(0),
      ...Array.from({
        length: Math.max(newLength - steps.length, 0),
      }).map(() => ({ actions: [] })),
    ];

    this.updatePattern(patternIndex, { steps: updatedSteps });
  }

  setSolo(solo: boolean, multi = false) {
    if (solo && !multi) {
      this.sampler.engine.getSamplers().forEach((sampler) => {
        sampler.chains.forEach((chain) => {
          chain.update({ solo: this === chain });
        });
      });
    } else {
      this.update({ solo });
    }
  }

  setCurrentPatternIndex = (index: number) => {
    this.update({ patterns: this.ensurePatternExists(this.patterns, index) });
  };

  duplicate() {
    this.sampler.createChain({ ...this.serialize(), id: `${this.id}_clone` });
  }

  serialize(): SerializedSlice {
    return {
      id: this.id,
      start: this.start,
      end: this.end,
      volume: this.gainNode.gain.value,
      playbackSpeed: this.player.playbackRate,
      reverse: this.player.reverse,
      color: this.color,
      patterns: this.patterns,
      name: this.name,
      solo: this.soloNode.solo,
      collapsed: this.collapsed,
    };
  }

  stop() {
    this.player.stop();
  }

  dispose() {
    this.sequence.stop();
    this.player.dispose();
    this.soloNode.dispose();
    this.gainNode.dispose();
    this.sequence.dispose();
    this.off('start-updated', this.updateBuffer);
    this.off('end-updated', this.updateBuffer);
  }

  play(time?: number) {
    this.player.start(time);
    this.emit('player-started');
  }
}

const createEmptyPattern = (numberOfSteps = 16): Pattern => ({
  subdivision: 16,
  subdivisionType: 'n',
  steps: Array.from({ length: numberOfSteps }).map(() => ({ actions: [] })),
});
