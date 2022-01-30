import { getDraw, Player, Sequence, ToneAudioBuffer, Transport } from 'tone';
import type Engine from './Engine';
import SubscriptionEventEmitter from './EventEmitter';
import type { Step } from '../SequencerStep';
import type { Slice } from '../Slice';

export interface SliceChainEvents {
  'sequence-event': (step: Step) => void;
  'slice-updated': (updatedSlice: Slice) => void;
}

export default class SliceChain extends SubscriptionEventEmitter<SliceChainEvents> {
  protected player: Player;

  protected sequence: Sequence<Step>;

  constructor(
    buffer: ToneAudioBuffer,
    protected slice: Slice,
    protected engine: Engine
  ) {
    super();

    this.player = new Player(buffer);
    this.player.toDestination();
    this.sequence = new Sequence(this.onSequenceEvent, []);

    this.sequence.start(0, Transport.progress);
    this.setSlice(slice);
  }

  protected onSequenceEvent = (time: number, step: Step) => {
    getDraw().schedule(() => {
      this.emit('sequence-event', step);
    }, time);

    const { slice } = this;

    for (let i = 0; i < step.actions.length; i += 1) {
      const action = step.actions[i];

      switch (action.type) {
        case 'PLAY': {
          if (!slice) break;

          if (slice.start < this.player.buffer.duration) {
            this.player.start(time, slice.start, slice.end - slice.start);
          }
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
    this.sequence.events = this.slice.patterns[this.engine.currentPatternIndex];
  }

  setSlice(slice: Slice) {
    this.slice = slice;
    this.updateSequence();
    this.emit('slice-updated', slice);
  }

  getSlice() {
    return this.slice;
  }

  stop() {
    this.player.stop();
  }

  dispose() {
    this.player.dispose();
    this.sequence.dispose();
  }

  getPlayer() {
    return this.player;
  }

  play(time?: number) {
    this.player.start(
      time,
      this.slice.start,
      this.slice.end - this.slice.start
    );
  }

  getSequence() {
    return this.sequence;
  }
}
