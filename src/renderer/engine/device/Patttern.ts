import { Sequence, Time } from 'tone';

import { TransportTime } from 'tone/build/esm/core/type/Units';
import { Engine } from '../Engine';
import { EngineBase } from '../EngineBase';
import { entries, PropertyUpdateEvents, randomColor } from '../helpers';
import { DeepPartial, subdivisionTypes } from '../types';
import { Slice } from './Slice';

export type FollowupActionBase = {
  linked: boolean;
  multiplicator: number;
  triggerTime: number;
};

export type SimpleAction = FollowupActionBase & {
  type:
    | 'next'
    | 'first'
    | 'last'
    | 'any'
    | 'other'
    | 'stop'
    | 'no'
    | 'previous';
};

export type JumpAction = FollowupActionBase & {
  type: 'jump';
  targetIndex: number;
};

export type FollowupAction = JumpAction | SimpleAction;

export const followupActionTypes: FollowupAction['type'][] = [
  'no',
  'stop',
  'jump',
  'first',
  'last',
  'next',
  'previous',
  'any',
  'other',
];

export type SerializedPattern = {
  name: string;
  color: string;
  subdivision: number;
  subdivisionType: typeof subdivisionTypes[number];
  followupAction?: FollowupAction;
  steps: Step[];
};

export type Step = {
  play: boolean;
  volume: number;
  playbackRate: number;
  pitch: number;
  reverse: boolean;
};

type PatternEvents = {
  change: (pattern: Pattern) => void;
};

export class Pattern extends EngineBase<
  PatternEvents & PropertyUpdateEvents<SerializedPattern>
> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  sequence: Sequence<Step> = null!;
  engine: Engine;

  name = '';
  color = '';
  steps: Step[] = [];
  subdivision = 16;
  subdivisionType: typeof subdivisionTypes[number] = 'n';
  followupAction?: FollowupAction;

  public constructor(public slice: Slice, pattern: SerializedPattern) {
    super();

    this.engine = slice.engine;

    this.set(pattern);
  }

  static normalizePatternData = (
    pattern: DeepPartial<SerializedPattern> | Step[]
  ): SerializedPattern =>
    Array.isArray(pattern)
      ? Pattern.normalizePatternData({
          steps: pattern,
        })
      : {
          name: pattern.name ?? '',
          color: pattern.color ?? randomColor(),
          followupAction: normalizeFollowupActionData(pattern.followupAction),
          subdivision: pattern.subdivision ?? 16,
          subdivisionType: pattern.subdivisionType ?? 'n',
          steps: (pattern.steps ?? [])
            .filter((maybeStep): maybeStep is DeepPartial<Step> => !!maybeStep)
            .map((step) => normalizeStepData(step)),
        };

  set(slicePartial: Partial<SerializedPattern>) {
    entries(slicePartial).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
        case 'steps':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.steps = entry[1]!;
          if (!this.sequence) {
            this.createSequence();
          } else {
            this.sequence.events = this.steps;
          }
          break;
        case 'subdivision':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.subdivision = entry[1]!;
          this.createSequence();
          break;
        case 'subdivisionType':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.subdivisionType = entry[1]!;
          this.createSequence();
          break;
        case 'followupAction':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.followupAction = entry[1]!;
          break;
        case 'name':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.name = entry[1]!;
          break;
        case 'color':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.color = entry[1]!;
          break;
        default:
          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).emit(`${entry[0]}Updated` as any, entry[1]);
    });

    this.emit('change', this);
  }

  protected createSequence() {
    const subdivision = Time(
      `${this.subdivision}${this.subdivisionType}`
    ).toSeconds();

    const previousSequence = this.sequence;

    if (previousSequence) {
      previousSequence.stop();
      previousSequence.clear();
      previousSequence.dispose();
    }

    this.sequence = new Sequence({
      callback: this.slice.onSequenceEvent,
      events: this.steps,
      subdivision,
    });

    return this.sequence;
  }

  setLength(newLength: number) {
    const steps = [
      ...this.steps.slice(0, newLength),
      ...Array.from({
        length: Math.max(newLength - this.steps.length, 0),
      }).map(() => normalizeStepData({})),
    ];

    this.set({ steps });
  }

  remove() {
    this.slice.removePattern(this);
  }

  start(time?: TransportTime) {
    this.createSequence().start(time, this.engine.transport.progress);
  }

  stop(time?: TransportTime) {
    this.sequence.stop(time);
  }

  serialize(): SerializedPattern {
    return {
      name: this.name,
      color: this.color,
      subdivision: this.subdivision,
      subdivisionType: this.subdivisionType,
      followupAction: this.followupAction,
      steps: this.steps.map((step) => ({
        ...step,
      })),
    };
  }

  dispose() {
    this.removeAllListeners();
    this.sequence.dispose();
  }
}

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

export const normalizeFollowupActionData = (
  followupAction?: DeepPartial<FollowupAction>
): FollowupAction | undefined => {
  if (!followupAction) return undefined;

  const commonProperties = {
    linked: followupAction.linked ?? false,
    multiplicator: followupAction.multiplicator ?? 1,
    triggerTime: followupAction.triggerTime ?? 16,
  };

  switch (followupAction.type) {
    case undefined:
      return undefined;
    case 'jump':
      return {
        ...commonProperties,
        type: followupAction.type,
        targetIndex: followupAction.targetIndex ?? 0,
      };
    default:
      return {
        type: followupAction.type,
        ...commonProperties,
      };
  }
};
