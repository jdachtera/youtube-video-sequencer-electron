/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Gain, getDraw, GrainPlayer, Solo, Time, ToneAudioBuffer } from 'tone';

import { debounce } from 'ts-debounce';

import { entries, PropertyUpdateEvents } from '../helpers';
import { SamplerDevice } from './Sampler';
import { DeviceChain, SerializedDeviceChain } from './DeviceChain';

import { batch, createUniqueId } from 'solid-js';
import { DeepPartial } from '../types';
import { EngineBase } from '../EngineBase';

import { Engine } from '../Engine';

import {
  normalizeStepData,
  Pattern,
  SerializedPattern,
  Step,
} from './Patttern';
import { TransportTime } from 'tone/build/esm/core/type/Units';

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
  patterns: SerializedPattern[];
  name: string;
  solo: boolean;
  collapsed: boolean;
  chain: SerializedDeviceChain;
};

export type SliceEvents = {
  sequenceEvent: (step: Step) => void;
  change: (slice: Slice) => void;
  playerStarted: () => void;
  playerStopped: () => void;
  currentPositionUpdated: (currentPosition: number) => void;
  load: () => void;
  patternAdded: (pattern: Pattern) => void;
  patternRemoved: (pattern: Pattern) => void;
  patternUpdated: (pattern: Pattern) => void;
} & PropertyUpdateEvents<SerializedSlice>;

export class Slice extends EngineBase<SliceEvents> {
  player = new GrainPlayer();

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

  engine: Engine;

  gainNode = new Gain();
  soloNode = new Solo();

  scheduledFollowUpAction = 0;

  iteration = 0;

  static normalizeData = (
    slice: DeepPartial<SerializedSlice & { playbackSpeed: number }>
  ): SerializedSlice => ({
    id: slice.id && slice.id !== '' ? slice.id : createUniqueId(),
    collapsed: slice.collapsed ?? false,
    mute: slice.mute ?? false,
    name: slice.name ?? '',
    color: slice.color ?? 'red',
    start: slice.start ?? 0,
    end: slice.end ?? 0,
    pitch: slice.pitch ?? 0,
    playbackRate: slice.playbackRate ?? slice.playbackSpeed ?? 1,
    reverse: slice.reverse ?? false,
    volume: slice.volume ?? 1,
    currentPatternIndex: slice.currentPatternIndex ?? 0,
    patterns: (() => {
      const patterns = (Array.isArray(slice.patterns) ? slice.patterns : [])
        .filter(
          (maybePattern): maybePattern is DeepPartial<SerializedPattern> =>
            !!maybePattern
        )
        .map(Pattern.normalizePatternData);

      return patterns?.[0]?.steps?.length ? patterns : [createEmptyPattern(16)];
    })(),
    solo: slice.solo ?? false,
    chain: DeviceChain.normalizeData(slice.chain ?? {}),
  });

  constructor(public sampler: SamplerDevice, serializedSlice: SerializedSlice) {
    super();

    this.setMaxListeners(1000);

    this.engine = sampler.engine;

    this.player.connect(this.gainNode);

    this.on('startUpdated', this.updateBuffer);
    this.on('endUpdated', this.updateBuffer);
    this.engine.on('start', this.startSequence);
    this.engine.on('stop', this.stopSequence);

    this.set(serializedSlice);
  }

  emitChange = () => this.emit('change', this);

  public onSequenceEvent = (time: number, step: Step) => {
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

  startSequence = () => {
    console.log('startSequence');
    this.getPattern()?.start();
    this.scheduleFollowUpAction();
  };

  stopSequence = () => {
    console.log('stopSequence');
    this.getPattern()?.stop();
    this.engine.transport.clear(this.scheduledFollowUpAction);
  };

  createPattern(patternData: SerializedPattern, index = this.patterns.length) {
    const pattern = new Pattern(this, patternData);

    pattern.on('change', (pattern) => {
      this.emit('patternUpdated', pattern);
      this.emit('change', this);
    });

    this.patterns = [
      ...this.patterns.slice(0, index),
      pattern,
      ...this.patterns.slice(index + 2),
    ];

    this.emit('patternAdded', pattern);
  }

  removePattern(pattern: Pattern) {
    const index = this.patterns.indexOf(pattern);
    this.patterns = [
      ...this.patterns.slice(0, index),
      ...this.patterns.slice(index + 1),
    ];

    if (this.patterns.length === 0) {
      this.createPattern(createEmptyPattern(16));
    }

    this.set({
      currentPatternIndex:
        (this.patterns.length + index - 1) & this.patterns.length,
    });

    this.emit('patternRemoved', pattern);

    pattern.dispose();
  }

  getPattern(index = this.currentPatternIndex): Pattern | undefined {
    return this.patterns?.[index];
  }

  set(slicePartial: Partial<SerializedSlice>) {
    batch(() => {
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
          case 'currentPatternIndex': {
            this.cuePattern(
              entry[1]!,
              Time(this.engine.transport.position).quantize('1n')
            );
            break;
          }
          case 'patterns': {
            this.getPattern()?.stop();
            this.patterns.forEach((pattern) => pattern.dispose());

            entry[1]?.forEach((pattern) => this.createPattern(pattern));

            break;
          }
          case 'chain':
            if (this.chain) {
              this.chain.input.disconnect(this.soloNode);
              this.chain.dispose();
              this.chain.off('change', this.emitChange);
              this.gainNode.disconnect(this.chain.input);
            }
            this.chain = new DeviceChain(this.engine, entry[1]!);
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
    });
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

  scheduleFollowUpAction() {
    const pattern = this.getPattern();

    if (!pattern) return;
    const {
      subdivision,
      subdivisionType,
      followupAction,
      steps: { length: patternLength },
    } = pattern;

    if (!followupAction || followupAction.type === 'no') return;

    const stepTime = Time(`${subdivision}${subdivisionType}`).toSeconds();

    const time = Time(
      Time(this.engine.transport.position).quantize(
        pattern.sequence.subdivision
      ) +
        (followupAction.linked
          ? stepTime * patternLength * followupAction.multiplicator
          : stepTime * followupAction.triggerTime)
    ).toBarsBeatsSixteenths();

    if (followupAction.type === 'stop') {
      this.getPattern()?.stop(time);
    } else {
      const nextPatternIndex = this.getNextPatternIndex();
      this.cuePattern(nextPatternIndex, time);
    }
    this.scheduledFollowUpAction = this.engine.transport.schedule(() => {
      this.scheduleFollowUpAction();
    }, time);
  }

  async cuePattern(nextPatternIndex: number, time: TransportTime) {
    if (this.scheduledFollowUpAction) {
      this.engine.transport.clear(this.scheduledFollowUpAction);
    }

    const currentPattern = this.getPattern();
    const nextPattern = this.getPattern(nextPatternIndex);

    currentPattern?.stop(time);

    nextPattern?.start(time);

    if (this.engine.transport.state === 'stopped') {
      this.currentPatternIndex = nextPatternIndex;

      this.emit('currentPatternIndexUpdated', nextPatternIndex);
      this.emit('change', this);
      console.log('stopped');
    } else {
      this.scheduledFollowUpAction = this.engine.transport.schedule(() => {
        console.log('sdfdsfsd');
        this.currentPatternIndex = nextPatternIndex;

        this.emit('currentPatternIndexUpdated', nextPatternIndex);
        this.emit('change', this);
        this.scheduleFollowUpAction();
      }, time);
    }
  }

  getNextPatternIndex() {
    const {
      followupAction,
      steps: { length: patternLength },
    } = this.patterns[this.currentPatternIndex];

    switch (followupAction?.type) {
      case 'any':
        return Math.floor(Math.random() * patternLength);
      case 'other':
        return this.patterns
          .map((_, index) => index)
          .splice(this.currentPatternIndex, 1)[
          Math.floor(Math.random() * (patternLength - 1))
        ];
      case 'next':
        return (this.currentPatternIndex + 1) % patternLength;
      case 'previous': {
        return patternLength + ((this.currentPatternIndex - 1) % patternLength);
      }
      case 'first':
        return 0;
      case 'last':
        return patternLength - 1;
      case 'jump':
        return followupAction.targetIndex % patternLength;
      default:
        return this.currentPatternIndex;
    }
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
      patterns: this.patterns.map((pattern) => pattern.serialize()),
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
    this.stopSequence();

    this.player.stop();
    this.player.disconnect();
    this.gainNode.disconnect();
    this.soloNode.disconnect();

    this.soloNode.dispose();
    this.player.dispose();
    this.gainNode.dispose();
    this.patterns.forEach((pattern) => pattern.dispose());

    this.engine.off('start', this.startSequence);
    this.engine.off('stop', this.stopSequence);
    this.removeAllListeners();
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

const createEmptyPattern = (numberOfSteps = 16): SerializedPattern => ({
  subdivision: 16,
  subdivisionType: 'n',
  steps: Array.from({ length: numberOfSteps }).map(() => normalizeStepData({})),
});
