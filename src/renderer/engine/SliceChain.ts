import {
  Gain,
  getDraw,
  Player,
  Sequence,
  ToneAudioBuffer,
  Transport,
} from 'tone';
import { TypedEmitter } from 'tiny-typed-emitter';
import type { Engine } from './Engine';
import type { Step } from '../SequencerStep';
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

  protected engine: Engine;

  protected slice: Slice;

  constructor(buffer: ToneAudioBuffer, engine: Engine, slice: Slice) {
    super();

    this.engine = engine;
    this.slice = slice;
    this.player = new Player(buffer);
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
    this.gain.gain.value = slice.volume ?? 1;
    //this.playbackSpeed.value = slice.playbackSpeed ?? 1;
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
