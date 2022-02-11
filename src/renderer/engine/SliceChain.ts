import { Gain, getDraw, Player, Sequence, Solo, Transport } from 'tone';
import { TypedEmitter } from 'tiny-typed-emitter';

import type { Step } from '../SequencerStep';
import type { Sampler } from './Sampler';
import type { Slice } from '../Slice';

export interface SliceChainEvents {
  'sequence-event': (step: Step) => void;
  'chain-updated': (updatedChain: SliceChain) => void;
  'volume-updated': (volume: number) => void;
  'playback-speed-updated': (playbackSpeed: number) => void;
  'player-started': () => void;
  'player-stopped': () => void;
}

export class SliceChain extends TypedEmitter<SliceChainEvents> {
  protected player: Player;

  gain = new Gain();

  solo = new Solo();

  protected sequence: Sequence<Step>;

  constructor(protected sampler: Sampler, protected slice: Slice) {
    super();

    this.player = new Player(this.sampler.buffer.slice(slice.start, slice.end));
    this.player.connect(this.gain);
    this.gain.connect(this.solo);

    this.sequence = this.createSequence();

    this.setSlice({ ...slice });
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

  protected getCurrentPattern(slice: Slice = this.slice) {
    return slice.patterns?.[this.sampler.getEngine().currentPatternIndex];
  }

  protected createSequence() {
    const currentPattern = this.getCurrentPattern();

    const sequence = new Sequence({
      callback: this.onSequenceEvent,
      events: currentPattern?.steps ?? [],
      subdivision: `${currentPattern?.subdivision ?? 16}${
        currentPattern?.subdivisionType ?? 'n'
      }`,
    });

    sequence.start(0, Transport.progress);
    return sequence;
  }

  setSlice(slice: Slice) {
    const previousSlice = this.slice;

    this.slice = this.ensurePatternExists(
      slice,
      this.sampler.getEngine().currentPatternIndex
    );

    if (previousSlice === this.slice) return;

    this.gain.gain.value = this.slice.volume ?? 1;
    this.player.playbackRate = this.slice.playbackSpeed ?? 1;
    this.player.reverse = this.slice.reverse ?? false;
    this.solo.solo = this.slice.solo ?? false;

    const currentPattern = this.getCurrentPattern(this.slice);
    const previousPattern = this.getCurrentPattern(previousSlice);

    if (
      !previousPattern ||
      currentPattern.subdivision !== previousPattern.subdivision ||
      currentPattern.subdivisionType !== previousPattern.subdivisionType
    ) {
      this.sequence.clear();
      this.sequence.dispose();
      this.sequence = this.createSequence();
    } else {
      if (this.getCurrentPattern(previousSlice) !== currentPattern) {
        this.sequence.events = currentPattern.steps;
      }
    }

    if (
      !previousSlice ||
      previousSlice.start !== this.slice.start ||
      previousSlice.end !== this.slice.end
    ) {
      this.player.buffer.set(
        this.sampler.buffer.slice(this.slice.start, this.slice.end)
      );
    }

    this.emit('chain-updated', this);
  }

  ensurePatternExists(slice: Slice, index: number) {
    if (slice.patterns.length < index + 1) {
      return {
        ...slice,
        patterns: [
          ...slice.patterns,
          ...Array.from({ length: index + 1 - slice.patterns.length }).map(
            () => ({
              subdivision: 16,
              subdivisionType: 'n' as const,
              steps: Array.from({ length: 16 }).map(() => ({
                actions: [],
              })),
            })
          ),
        ],
      };
    }
    return slice;
  }

  setCurrentPatternIndex = (index: number) => {
    if (this.slice.patterns.length < index + 1) {
      this.setSlice(this.ensurePatternExists(this.slice, index));
    } else {
      this.sequence.events = this.getCurrentPattern().steps;
    }
  };

  getSlice() {
    return this.slice;
  }

  stop() {
    this.player.stop();
  }

  dispose() {
    this.sequence.stop();
    this.player.dispose();
    this.sequence.dispose();
  }

  getPlayer() {
    return this.player;
  }

  getSampler() {
    return this.sampler;
  }

  play(time?: number) {
    this.player.start(time);
    this.emit('player-started');
  }

  getSequence() {
    return this.sequence;
  }
}
