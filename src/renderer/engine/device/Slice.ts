/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Gain,
  getDraw,
  GrainPlayer,
  Sequence,
  Solo,
  Time,
  ToneAudioBuffer,
  Transport,
} from 'tone';

import { debounce } from 'ts-debounce';

import { entries, PropertyUpdateEvents } from '../helpers';
import { SamplerDevice } from './Sampler';
import { DeviceChain, SerializedDeviceChain } from './DeviceChain';

import { batch, createUniqueId } from 'solid-js';
import { DeepPartial, subdivisionTypes } from '../types';
import { EngineBase } from '../EngineBase';

export type SerializedSlice = {
  id: string;
  start: number;
  end: number;
  volume: number;
  mute: boolean;
  playbackRate: number;
  pitch: number;
  reverse: boolean;
  color: string;
  currentPatternIndex: number;
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

export type Step = {
  play: boolean;
  volume: number;
  playbackRate: number;
  pitch: number;
  reverse: boolean;
};

export type SliceEvents = {
  sequenceEvent: (step: Step) => void;
  change: (slice: Slice) => void;
  playerStarted: () => void;
  playerStopped: () => void;
  currentPositionUpdated: (currentPosition: number) => void;
  load: () => void;
} & PropertyUpdateEvents<SerializedSlice>;

export class Slice extends EngineBase<SliceEvents> {
  player = new GrainPlayer();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  sequence: Sequence<Step> = null!;

  id = '';
  start = 0;
  end = 1;
  reverse = false;
  color = 'red';
  patterns: Pattern[] = [];
  name = '';
  collapsed = false;

  playbackRate = 1;
  pitch = 1;
  volume = 1;

  firstFrameTime = 0;
  lastFrameTime = 0;
  currentPosition = 0;

  currentPatternIndex = 0;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  chain: DeviceChain = null!;

  gainNode = new Gain();
  soloNode = new Solo();

  static normalizeData = (
    slice: DeepPartial<SerializedSlice>
  ): SerializedSlice => ({
    id: slice.id && slice.id !== '' ? slice.id : createUniqueId(),
    collapsed: slice.collapsed ?? false,
    mute: slice.mute ?? false,
    name: slice.name ?? '',
    color: slice.color ?? 'red',
    start: slice.start ?? 0,
    end: slice.end ?? 0,
    pitch: slice.pitch ?? 0,
    playbackRate: slice.playbackRate ?? 1,
    reverse: slice.reverse ?? false,
    volume: slice.volume ?? 1,
    currentPatternIndex: slice.currentPatternIndex ?? 0,
    patterns: (Array.isArray(slice.patterns) ? slice.patterns : [])
      .filter((maybeStep): maybeStep is DeepPartial<Pattern> => !!maybeStep)
      .map(normalizePatternData),
    solo: slice.solo ?? false,
    chain: DeviceChain.normalizeData(slice.chain ?? {}),
  });

  constructor(public sampler: SamplerDevice, serializedSlice: SerializedSlice) {
    super();

    this.setMaxListeners(1000);

    this.player.connect(this.gainNode);

    this.on('startUpdated', this.updateBuffer);
    this.on('endUpdated', this.updateBuffer);

    this.set(serializedSlice);
  }

  emitChange = () => this.emit('change', this);

  protected onSequenceEvent = (time: number, step: Step) => {
    if (step.play) {
      this.player.set({ reverse: step.reverse ? !this.reverse : this.reverse });
      this.play(time);
    }
    this.player.playbackRate = this.playbackRate * step.playbackRate;
    this.player.detune = this.pitch + step.pitch;

    this.gainNode.gain.setValueAtTime(this.volume * step.volume, time);

    this.chain.handleSequenceEvent(time, step);

    getDraw().schedule(() => {
      this.emit('sequenceEvent', step);
    }, time);
  };

  protected getCurrentPattern(patterns: Pattern[]) {
    return patterns?.[this.currentPatternIndex];
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

  set(slicePartial: Partial<SerializedSlice>) {
    entries(slicePartial).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'volume':
          this.volume = entry[1] ?? 1;
          break;
        case 'playbackRate':
          this.playbackRate = entry[1] ?? 1;
          break;
        case 'pitch':
          this.pitch = entry[1] ?? 1;
          break;
        case 'reverse':
          this.reverse = entry[1] ?? false;
          break;
        case 'solo':
          this.soloNode.solo = entry[1] ?? false;
          break;
        case 'mute':
          this.player.mute = entry[1] ?? false;
          break;
        case 'currentPatternIndex':
          this.currentPatternIndex = entry[1]!;
          this.set({
            patterns: this.ensurePatternExists(
              this.patterns,
              this.currentPatternIndex
            ),
          });
          break;

        case 'patterns': {
          this.patterns = this.ensurePatternExists(
            entry[1] ?? [],
            this.sampler.engine.currentPatternIndex
          );

          this.updateSequence();
          break;
        }
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
        case 'id':
        case 'name':
        case 'color':
          this[entry[0]] = entry[1] ?? '';
          break;
        case 'start':
          this.start = entry[1]!;
          break;
        case 'end':
          this.end = entry[1]!;
          break;
        case 'collapsed':
          this[entry[0]] = entry[1] ?? false;
          break;
        default:
          entry[0];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    this.emit('change', this);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateBuffer = debounce(async (..._args: unknown[]) => {
    await this.sampler.hasLoaded();

    const { buffer } = this.sampler;

    const start = Math.max(this.start, 0);
    const end = Math.min(this.end, buffer.duration);

    const slicedBuffer =
      start < end ? buffer.slice(start, end) : new ToneAudioBuffer();

    this.player.buffer.set(slicedBuffer);
    this.emit('load');
  }, 10);

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

    this.set({ patterns: updatedPatterns });
  }

  updatePatternLength(patternIndex: number, newLength: number) {
    const { steps } = this.patterns[patternIndex];

    const updatedSteps = [
      ...steps.slice(0, newLength),
      ...Array.from({
        length: Math.max(newLength - steps.length, 0),
      }).map(() => normalizeStepData({})),
    ];

    this.updatePattern(patternIndex, { steps: updatedSteps });
  }

  setSolo(solo: boolean, multi = false) {
    if (solo && !multi) {
      this.sampler.slices.forEach((slice) =>
        slice.set({ solo: this === slice })
      );
    } else {
      this.set({ solo });
    }
  }

  duplicate() {
    this.sampler.createSlice(
      { ...this.serialize(), id: `${this.id}_clone` },
      this.sampler.slices.indexOf(this) + 1
    );
  }

  serialize() {
    return {
      id: this.id,
      start: this.start,
      end: this.end,
      volume: this.volume,
      playbackRate: this.playbackRate,
      pitch: this.pitch,
      reverse: this.reverse,
      color: this.color,
      currentPatternIndex: this.currentPatternIndex,
      patterns: this.patterns.map((pattern) => {
        return {
          ...pattern,
          steps: pattern.steps.map((step) => ({
            ...step,
          })),
        };
      }),
      name: this.name,
      solo: this.soloNode.solo,
      mute: this.player.mute,
      collapsed: this.collapsed,
      chain: this.chain.serialize(),
    };
  }

  stop(time?: number) {
    this.player.stop(time);
  }

  dispose() {
    this.sequence.stop();

    this.player.stop();
    this.player.disconnect();
    this.gainNode.disconnect();
    this.soloNode.disconnect();

    this.soloNode.dispose();
    this.player.dispose();
    this.gainNode.dispose();
    this.sequence.dispose();
    this.off('startUpdated', this.updateBuffer);
    this.off('endUpdated', this.updateBuffer);
  }

  updatePlayPosition = () => {
    const now = this.player.immediate();
    this.currentPosition = now - this.firstFrameTime;

    const timeSinceLastFrame = now - this.lastFrameTime;
    this.lastFrameTime = now;
    if (timeSinceLastFrame > 0.003) {
      batch(() => {
        this.emit(
          'currentPositionUpdated',
          this.currentPosition / this.player.playbackRate
        );
      });
    }

    if (this.player.state === 'started') {
      requestAnimationFrame(this.updatePlayPosition);
    }
  };

  play(time?: number) {
    if (!this.player.buffer.loaded) return;

    try {
      this.stop(time);
      this.player.start(time);
      this.firstFrameTime = this.player.immediate();
      this.lastFrameTime = this.player.immediate();

      requestAnimationFrame(this.updatePlayPosition);
    } catch (e) {
      console.log({ e, time, p: this.player });
    }
    this.updatePlayPosition();
    this.emit('playerStarted');
  }
}

const createEmptyPattern = (numberOfSteps = 16): Pattern => ({
  subdivision: 16,
  subdivisionType: 'n',
  steps: Array.from({ length: numberOfSteps }).map(() => normalizeStepData({})),
});

export const normalizeStepData = (
  step: DeepPartial<Step & { actions: unknown[] }>
): Step => ({
  play: step.play ?? false,
  playbackRate: step.playbackRate ?? 1,
  volume: step.volume ?? 1,
  ...(step.actions?.length && { play: true }),
  pitch: step.pitch ?? 1,
  reverse: step.reverse ?? false,
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
