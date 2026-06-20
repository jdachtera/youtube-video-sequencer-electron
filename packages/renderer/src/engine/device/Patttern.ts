import type { Note } from 'solid-pianoroll';
import { Part, Sequence, Time } from 'tone';
import type { TransportTime } from 'tone/build/esm/core/type/Units';
import type { Engine } from '../Engine';
import { EngineBase } from '../EngineBase';
import type { PropertyUpdateEvents } from '../helpers';
import { entries, randomColor } from '../helpers';
import type { DeepPartial, subdivisionTypes } from '../types';
import type { SequencerDevice } from './Sequencer';

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

export type PatternMode = 'steps' | 'pianoroll';

export type SerializedPattern = {
  name: string;
  color: string;
  subdivision: number;
  subdivisionType: typeof subdivisionTypes[number];
  followupAction?: FollowupAction;
  steps: Step[];
  // Melodic piano-roll mode: notes (MIDI/PPQ based) that pitch-shift the
  // downstream slice instead of just triggering it.
  mode: PatternMode;
  notes: Note[];
  ppq: number;
  duration: number;
};

// MIDI note the sample plays back at its natural pitch (C4). Notes above pitch
// up, notes below pitch down.
export const PIANO_ROLL_ROOT_MIDI = 60;

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
  part: Part<{ time: string; note: Note }> | null = null;
  engine: Engine;

  name = '';
  color = '';
  steps: Step[] = [];
  subdivision = 16;
  subdivisionType: typeof subdivisionTypes[number] = 'n';
  followupAction?: FollowupAction;

  mode: PatternMode = 'steps';
  notes: Note[] = [];
  ppq = 192;
  duration = 192 * 16;

  public constructor(
    public sequencer: SequencerDevice,
    pattern: SerializedPattern,
  ) {
    super();

    this.engine = sequencer.engine;

    this.set(pattern);
  }

  static normalizePatternData = (
    pattern: DeepPartial<SerializedPattern> | Step[],
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
          steps: (pattern.steps ?? []).map((step) => normalizeStepData(step)),
          mode: pattern.mode === 'pianoroll' ? 'pianoroll' : 'steps',
          notes: Array.isArray(pattern.notes)
            ? pattern.notes.map((note) => normalizeNoteData(note))
            : [],
          ppq: pattern.ppq ?? 192,
          duration: pattern.duration ?? 192 * 16,
        };

  set(patternPartial: Partial<SerializedPattern>) {
    entries(patternPartial).forEach((entry) => {
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
        case 'mode':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.mode = entry[1]!;
          // Stop the step sequence and (re)build the note part so the right
          // scheduler is active for the new mode.
          this.sequence?.stop();
          this.createPart();
          if (
            this.engine.transport.state === 'started' &&
            this.sequencer.getPattern() === this
          ) {
            this.start();
          }
          break;
        case 'notes': {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.notes = entry[1]!;
          if (this.mode === 'pianoroll') {
            const wasStarted = this.part?.state === 'started';
            this.createPart();
            if (wasStarted) this.part?.start(0);
          }
          break;
        }
        case 'ppq':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.ppq = entry[1]!;
          if (this.mode === 'pianoroll') this.createPart();
          break;
        case 'duration':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.duration = entry[1]!;
          if (this.part) {
            this.part.loopEnd = this.ticksToToneTime(this.duration);
          }
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
      `${this.subdivision}${this.subdivisionType}`,
    ).toSeconds();

    const previousSequence = this.sequence;
    // Whether the sequence we're about to replace was actively playing. Only
    // the current pattern of a running sequencer is in the 'started' state.
    const wasStarted = previousSequence?.state === 'started';

    if (previousSequence) {
      previousSequence.stop();
      previousSequence.clear();
      previousSequence.dispose();
    }

    this.sequence = new Sequence({
      callback: this.sequencer.onSequenceEvent,
      events: this.steps,
      subdivision,
    });

    // If we just replaced a sequence that was playing (e.g. the user changed
    // the subdivision/type mid-playback), start the new one so the channel
    // keeps playing instead of falling silent until the next stop/start.
    if (wasStarted) {
      this.start();
    }

    return this.sequence;
  }

  // Convert piano-roll ticks (in this pattern's ppq) to a Tone transport-tick
  // time string, so note timing stays correct across tempo changes.
  protected ticksToToneTime(ticks: number) {
    const quarters = ticks / (this.ppq || 192);
    const toneTicks = Math.round(quarters * this.engine.transport.PPQ);
    return `${toneTicks}i`;
  }

  // Build (or tear down) the Tone.Part that schedules piano-roll notes. Each
  // note fires the same sequenceEvent the step grid uses, but pitched: the
  // playbackRate is derived from the note's distance from the root, so the
  // downstream slice plays back at the note's pitch.
  protected createPart() {
    if (this.part) {
      this.part.stop();
      this.part.clear();
      this.part.dispose();
      this.part = null;
    }

    if (this.mode !== 'pianoroll') return;

    const part = new Part<{ time: string; note: Note }>((time, value) => {
      const { note } = value;
      const semitones = note.midi - PIANO_ROLL_ROOT_MIDI;
      this.sequencer.onSequenceEvent(time, {
        play: true,
        volume: note.velocity ?? 1,
        playbackRate: Math.pow(2, semitones / 12),
        pitch: 0,
        reverse: false,
      });
    }, []);

    this.notes.forEach((note) =>
      part.add({ time: this.ticksToToneTime(note.ticks), note }),
    );

    part.loop = true;
    part.loopEnd = this.ticksToToneTime(this.duration);

    this.part = part;
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
    this.sequencer.removePattern(this);
  }

  start(time?: TransportTime) {
    if (this.mode === 'pianoroll') {
      if (!this.part) this.createPart();
      this.part?.start(time ?? 0);
      return;
    }
    if (time === undefined && this.engine.transport.state === 'started') {
      const sequenceDuration =
        this.sequence.toSeconds(this.sequence.subdivision) *
        this.sequence.length;

      const progress = this.engine.transport.seconds % sequenceDuration;

      const offsetIndex = Math.ceil(
        (progress / sequenceDuration) * this.sequence.length,
      );

      const offsetTime =
        offsetIndex * this.sequence.toSeconds(this.sequence.subdivision) -
        progress;

      this.sequence.start(
        this.engine.transport.seconds + offsetTime,
        offsetIndex,
      );
    } else {
      this.sequence.start(time, 0);
    }
  }

  stop(time?: TransportTime) {
    this.sequence?.stop(time);
    this.part?.stop(time);
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
      mode: this.mode,
      notes: this.notes.map((note) => ({ ...note })),
      ppq: this.ppq,
      duration: this.duration,
    };
  }

  dispose() {
    this.removeAllListeners();
    this.sequence?.dispose();
    this.part?.dispose();
  }
}

export const normalizeNoteData = (note: DeepPartial<Note>): Note => ({
  ticks: note.ticks ?? 0,
  durationTicks: note.durationTicks ?? 0,
  midi: note.midi ?? PIANO_ROLL_ROOT_MIDI,
  velocity: note.velocity ?? 1,
});

export const normalizeStepData = (
  step: DeepPartial<Step & { actions: unknown[] }>,
): Step => ({
  play: step.play ?? false,
  playbackRate: step.playbackRate ?? 1,
  volume: step.volume ?? 1,
  ...(step.actions?.length && { play: true }),
  pitch: step.pitch ?? 1,
  reverse: step.reverse ?? false,
});

export const normalizeFollowupActionData = (
  followupAction?: DeepPartial<FollowupAction>,
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
