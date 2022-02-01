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

  protected slice: Slice;

  constructor(protected sampler: Sampler, slice: Slice) {
    super();

    this.slice = slice;
    this.player = new Player(this.sampler.buffer.slice(slice.start, slice.end));
    this.player.connect(this.gain);

    this.sequence = new Sequence({
      callback: this.onSequenceEvent,
      events: [],
      subdivision: '16n',
    });

    this.sequence.start(0, Transport.progress);

    this.setSlice(slice);
  }

  protected onSequenceEvent = (time: number, step: Step) => {
    getDraw().schedule(() => {
      this.emit('sequence-event', step);
    }, time);

    for (let i = 0; i < step.actions.length; i += 1) {
      const action = step.actions[i];

      switch (action.type) {
        case 'PLAY': {
          this.play();
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

  public updateSequence() {
    this.sequence.events =
      this.slice.patterns[this.sampler.getEngine().currentPatternIndex];
  }

  setSlice(slice: Slice) {
    if (this.slice.start !== slice.start || this.slice.end !== slice.end) {
      this.player.buffer.set(this.sampler.buffer.slice(slice.start, slice.end));
    }

    this.slice = slice;
    this.gain.gain.value = slice.volume ?? 1;

    this.updateSequence();
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
    const { slice } = this;
    if (!slice) return;

    this.player.playbackRate = slice.playbackSpeed ?? 1;
    this.player.reverse = slice.reverse ?? false;

    this.player.start(time);
  }

  getSequence() {
    return this.sequence;
  }
}
