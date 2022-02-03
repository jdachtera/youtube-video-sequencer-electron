import { Gain, getDraw, Player, Sequence, Transport } from 'tone';
import { TypedEmitter } from 'tiny-typed-emitter';

import type { Step } from '../SequencerStep';
import type { Sampler } from './Sampler';
import type { Slice } from '../Slice';

export interface SliceChainEvents {
  'sequence-event': (step: Step) => void;
  'chain-updated': (updatedChain: SliceChain) => void;
  'volume-updated': (volume: number) => void;
  'playback-speed-updated': (playbackSpeed: number) => void;
}

export class SliceChain extends TypedEmitter<SliceChainEvents> {
  protected player: Player;

  gain = new Gain();

  protected sequence: Sequence<Step>;

  constructor(protected sampler: Sampler, protected slice: Slice) {
    super();

    this.player = new Player(this.sampler.buffer.slice(slice.start, slice.end));
    this.player.connect(this.gain);

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

  protected getCurrentPattern(slice: Slice) {
    return slice.patterns[this.sampler.getEngine().currentPatternIndex];
  }

  protected createSequence() {
    const sequence = new Sequence(
      this.onSequenceEvent,
      this.getCurrentPattern(this.slice),
      `${this.slice.subdivision ?? 16}${this.slice.subdivisionType ?? 'n'}`
    );
    sequence.start(0, Transport.progress);
    return sequence;
  }

  setSlice(slice: Slice) {
    const previousSlice = this.slice;
    this.slice = slice;
    if (previousSlice === slice) return;

    if (
      slice.subdivision !== previousSlice.subdivision ||
      slice.subdivisionType !== previousSlice.subdivisionType
    ) {
      this.sequence.dispose();
      this.sequence = this.createSequence();
    } else {
      const currentPattern = this.getCurrentPattern(slice);
      if (this.getCurrentPattern(previousSlice) !== currentPattern) {
        this.sequence.events = currentPattern;
      }
    }

    if (
      previousSlice.start !== slice.start ||
      previousSlice.end !== slice.end
    ) {
      this.player.buffer.set(this.sampler.buffer.slice(slice.start, slice.end));
    }

    this.gain.gain.value = slice.volume ?? 1;

    this.player.playbackRate = slice.playbackSpeed ?? 1;
    this.player.reverse = slice.reverse ?? false;

    this.emit('chain-updated', this);
  }

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
    this.player.start(time, 0, this.slice.end - this.slice.start);
  }

  getSequence() {
    return this.sequence;
  }
}
