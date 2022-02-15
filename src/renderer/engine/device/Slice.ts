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
import { debounce } from 'ts-debounce';

import { entries, PropertyUpdateEvents } from '../helpers';
import { Sampler } from './Sampler';
import { DeviceChain, SerializedDeviceChain } from './DeviceChain';

import { createUniqueId } from 'solid-js';
import { DeepPartial, subdivisionTypes } from '../types';

export type SerializedSlice = {
  id: string;
  start: number;
  end: number;
  volume: number;
  playbackSpeed: number;
  reverse: boolean;
  color: string;
  patterns: Pattern[];
  name: string;
  solo: boolean;
  collapsed: boolean;
  chain: SerializedDeviceChain;
};

export type Pattern = {
  subdivision: number;
  subdivisionType: typeof subdivisionTypes[number];
  steps: Step[];
};

export type Action =
  | {
      type: 'PLAY';
      velocity?: number;
    }
  | {
      type: 'PAUSE';
    }
  | {
      type: 'SET_PLAYBACK_SPEED';
      value: number;
    }
  | {
      type: 'SET_REVERSE';
      value: boolean;
    };

export type Step = {
  actions: Action[];
};

export type SliceEvents = {
  sequenceEvent: (step: Step) => void;
  change: (slice: Slice) => void;
  playerStarted: () => void;
  playerStopped: () => void;
  load: () => void;
} & PropertyUpdateEvents<SerializedSlice>;

export class Slice extends TypedEmitter<SliceEvents> {
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

  chain: DeviceChain = null!;

  gainNode = new Gain();
  soloNode = new Solo();

  static normalizeData = (
    slice: DeepPartial<SerializedSlice>
  ): SerializedSlice => ({
    id: slice.id ?? createUniqueId(),
    collapsed: slice.collapsed ?? false,
    name: slice.name ?? '',
    color: slice.color ?? 'red',
    start: slice.start ?? 0,
    end: slice.end ?? 10,
    playbackSpeed: slice.playbackSpeed ?? 1,
    reverse: slice.reverse ?? false,
    volume: slice.volume ?? 1,
    patterns: (Array.isArray(slice.patterns) ? slice.patterns : [])
      .filter((maybeStep): maybeStep is DeepPartial<Pattern> => !!maybeStep)
      .map(normalizePatternData),
    solo: slice.solo ?? false,
    chain: DeviceChain.normalizeData(slice.chain ?? {}),
  });

  constructor(public sampler: Sampler, serializedSlice: SerializedSlice) {
    super();

    this.setMaxListeners(1000);

    this.player.connect(this.gainNode);

    this.on('startUpdated', this.updateBuffer);
    this.on('endUpdated', this.updateBuffer);

    this.update(serializedSlice);
  }

  emitChange = () => this.emit('change', this);

  protected onSequenceEvent = (time: number, step: Step) => {
    getDraw().schedule(() => {
      this.emit('sequenceEvent', step);
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
      this.sequence.events = [...pattern.steps];
    } else {
      if (this.sequence) {
        this.sequence.clear();
        this.sequence.stop();
        this.sequence.dispose();
      }

      this.sequence = new Sequence({
        callback: this.onSequenceEvent,
        events: [...(pattern?.steps ?? [])],
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
        case 'chain':
          if (this.chain) {
            this.chain.input.disconnect(this.soloNode);
            this.chain.dispose();
            this.chain.off('change', this.emitChange);
            this.gainNode.disconnect(this.chain.input);
          }
          this.chain = new DeviceChain(this.sampler.engine, entry[1]!);
          this.chain.on('change', this.emitChange);

          this.gainNode.connect(this.chain.input);
          this.chain.output.connect(this.soloNode);

          break;

        default:
      }

      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    this.emit('change', this);
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
      this.sampler.engine.tracks.forEach((track) => {
        track.chain.devices.forEach((device) => {
          if (device instanceof Sampler) {
            device.slices.forEach((slice) => {
              slice.update({ solo: this === slice });
            });
          }
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
    this.sampler.createSlice({ ...this.serialize(), id: `${this.id}_clone` });
  }

  serialize() {
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
      chain: this.chain.serialize(),
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
    this.off('startUpdated', this.updateBuffer);
    this.off('endUpdated', this.updateBuffer);
  }

  play(time?: number) {
    this.player.start(time);
    this.emit('playerStarted');
  }
}

const createEmptyPattern = (numberOfSteps = 16): Pattern => ({
  subdivision: 16,
  subdivisionType: 'n',
  steps: Array.from({ length: numberOfSteps }).map(() => ({ actions: [] })),
});

export const normalizeStepData = (step: DeepPartial<Step>): Step => ({
  actions: (Array.isArray(step.actions) ? step.actions : [])
    .map((action): Action | undefined => {
      switch (action?.type) {
        case 'PLAY':
          return {
            ...action,
            type: action.type,
            velocity: action.velocity ?? 1,
          };
        case 'PAUSE':
          return { type: 'PAUSE' };
        case 'SET_PLAYBACK_SPEED':
          return { ...action, type: action.type, value: action.value ?? 1 };
        case 'SET_REVERSE':
          return { ...action, type: action.type, value: action.value ?? false };
        default:
          return undefined;
      }
    })
    .filter((action): action is Action => !!action),
});

export const normalizePatternData = (
  pattern: DeepPartial<Pattern> | Step[]
): Pattern => ({
  subdivision: Array.isArray(pattern) ? 16 : pattern.subdivision ?? 16,
  subdivisionType: Array.isArray(pattern)
    ? 'n'
    : pattern.subdivisionType ?? 'n',
  steps: (Array.isArray(pattern)
    ? pattern
    : Array.isArray(pattern.steps)
    ? pattern.steps
    : []
  )
    .filter((maybeStep): maybeStep is DeepPartial<Step> => !!maybeStep)
    .map((step) => normalizeStepData(step)),
});
