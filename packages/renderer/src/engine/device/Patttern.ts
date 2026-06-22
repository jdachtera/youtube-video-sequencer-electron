import type { Automation, Note } from 'solid-pianoroll';
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
  // Time-based automation curves (volume/detune/playbackRate breakpoints),
  // edited in the piano roll's automation lane. Keyed by parameter.
  automation: Automation;
};

// MIDI note the sample plays back at its natural pitch (C4). Notes above pitch
// up, notes below pitch down.
export const PIANO_ROLL_ROOT_MIDI = 60;

// Piano-roll notes carry a MIDI-style velocity (0–127; the editor draws new
// notes at 100). The slice voice's volume is a 0–1 gain, so normalize on the
// way into playback instead of feeding raw velocity in as gain.
export const MAX_MIDI_VELOCITY = 127;
export const DEFAULT_NOTE_VELOCITY = 100;
export const velocityToGain = (velocity: number | undefined) =>
  Math.min(
    1,
    Math.max(0, (velocity ?? DEFAULT_NOTE_VELOCITY) / MAX_MIDI_VELOCITY),
  );

export type Step = {
  play: boolean;
  volume: number;
  playbackRate: number;
  pitch: number;
  reverse: boolean;
  // Optional note-off gate in seconds. The step grid never sets this (a step
  // plays the slice to its natural end); the piano roll sets it from the
  // note's length so melodies release on time. Monophonic per slice.
  gateSeconds?: number;
};

type PatternEvents = {
  change: (pattern: Pattern) => void;
};

/**
 * A pattern owns the two schedulers a track can play back with and keeps both
 * editable while the transport is running:
 *
 * - Step mode: a Tone.Sequence whose events are swapped in place
 *   (`sequence.events = steps`) on every step edit, so toggling steps never
 *   tears the sequence down. Tone.Sequence's subdivision is constructor-only,
 *   so changing the division is the one case that rebuilds the sequence — and
 *   createSequence then restarts it aligned to the transport so the channel
 *   doesn't drop out. Tone.Sequence also owns looping and the per-schedule
 *   start offset that pattern-chaining (follow-up actions) relies on.
 * - Piano-roll mode: a single long-lived Tone.Part whose events are refreshed
 *   in place (clear + re-add) on note edits, never disposed/restarted mid-play.
 *
 * Switching mode stops the inactive scheduler and starts the active one; only
 * the sequencer's current pattern is ever in the 'started' state.
 */
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
  automation: Automation = {};

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
          automation: (pattern.automation as Automation) ?? {},
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
        case 'mode': {
          const previousMode = this.mode;
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.mode = entry[1]!;
          // Sync note data between views so the melody is preserved on switch.
          if (this.mode === 'pianoroll' && previousMode !== 'pianoroll') {
            const converted = this.stepsToNotes();
            if (converted.length > 0) {
              this.notes = converted;
              // Size the clip to cover all steps at the current subdivision.
              const bpm = this.engine.transport.bpm.value || 120;
              const stepDurationSeconds = Time(
                `${this.subdivision}${this.subdivisionType}`,
              ).toSeconds();
              const stepDurationTicks = Math.max(
                1,
                Math.round((stepDurationSeconds * bpm * this.ppq) / 60),
              );
              const totalTicks = this.steps.length * stepDurationTicks;
              const tpb = (this.ppq || 192) * 4;
              this.duration = Math.max(tpb, Math.ceil(totalTicks / tpb) * tpb);
            }
          } else if (this.mode === 'steps' && previousMode !== 'steps') {
            if (this.notes.length > 0) {
              const converted = this.notesToSteps();
              this.steps = converted;
              if (this.sequence) {
                this.sequence.events = this.steps;
              }
            }
          }
          // Swap schedulers: stop the step sequence and sync the note part
          // (syncPart tears the part down when leaving piano-roll mode).
          this.sequence?.stop();
          this.syncPart();
          if (
            this.engine.transport.state === 'started' &&
            this.sequencer.getPattern() === this
          ) {
            this.start();
          }
          break;
        }
        case 'notes':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.notes = entry[1]!;
          // Live-update the running part in place (no restart) so editing
          // notes mid-playback doesn't flood the slice with retriggers.
          if (this.mode === 'pianoroll') this.syncPart();
          break;
        case 'ppq':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.ppq = entry[1]!;
          if (this.mode === 'pianoroll') this.syncPart();
          break;
        case 'duration':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.duration = entry[1]!;
          // Visual timeline only; the playback loop derives from the notes
          // (loopLengthTicks), so this doesn't drive loopEnd.
          break;
        case 'automation':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.automation = entry[1]!;
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
  // time string, so note timing stays correct across tempo changes. Guards
  // against a missing/NaN transport PPQ, which would otherwise produce an
  // invalid "NaNi" time and collapse the loop to zero length.
  protected ticksToToneTime(ticks: number) {
    const ppq = this.ppq || 192;
    const transportPPQ = Number.isFinite(this.engine.transport.PPQ)
      ? this.engine.transport.PPQ
      : 192;
    const toneTicks = Math.max(0, Math.round((ticks / ppq) * transportPPQ));
    return `${toneTicks}i`;
  }

  protected loopLengthTicks() {
    // The piano-roll clip length is explicit — the editor's duration (set via
    // the Length control) — so the loop is exactly that length, floored to one
    // bar so it's never zero. Notes past the clip end simply aren't looped.
    const ticksPerBar = (this.ppq || 192) * 4;
    return Math.max(ticksPerBar, Math.round(this.duration) || ticksPerBar);
  }

  // Lazily create the Tone.Part. It's created once and kept alive; note edits
  // update its events in place (see syncPart) instead of disposing and
  // restarting it, which while playing would flood the slice with retriggers.
  protected ensurePart() {
    if (this.part) return this.part;

    const part = new Part<{ time: string; note: Note }>((time, value) => {
      const { note } = value;
      const semitones = note.midi - PIANO_ROLL_ROOT_MIDI;
      // Transposition in cents: the note's pitch (midi vs root) plus any fine
      // per-note detune. The slice transposes via `pitch`; `playbackRate` is an
      // independent per-note speed.
      const pitchCents = semitones * 100 + (note.detune ?? 0);
      // Note length in seconds at the current tempo, so the slice releases
      // when the note ends.
      const bpm = this.engine.transport.bpm.value;
      const gateSeconds =
        note.durationTicks > 0
          ? (note.durationTicks / (this.ppq || 192)) * (60 / bpm)
          : 0;
      this.sequencer.onSequenceEvent(time, {
        play: true,
        volume: velocityToGain(note.velocity),
        playbackRate: note.playbackRate ?? 1,
        pitch: pitchCents,
        reverse: note.reverse ?? false,
        gateSeconds,
      });
    }, []);

    part.loop = true;
    this.part = part;
    return part;
  }

  // Push the current notes and loop length into the Part in place (no restart),
  // or tear the part down when the pattern leaves piano-roll mode.
  // Convert the current steps array into piano-roll notes so the melody is
  // preserved when switching from step mode to piano-roll mode. Each enabled
  // step becomes a note; pitch/playbackRate are folded into a MIDI number;
  // volume maps to velocity; gateSeconds (if set) maps to durationTicks.
  protected stepsToNotes(): Note[] {
    const bpm = this.engine.transport.bpm.value || 120;
    const stepDurationSeconds = Time(
      `${this.subdivision}${this.subdivisionType}`,
    ).toSeconds();
    const stepDurationTicks = Math.max(
      1,
      Math.round((stepDurationSeconds * bpm * this.ppq) / 60),
    );

    const notes: Note[] = [];
    this.steps.forEach((step, index) => {
      if (!step.play) return;

      // The step's pitch is a cents offset from the root; split it into an
      // integer midi (so the melody shows on the roll) and a fine detune
      // remainder. playbackRate and reverse carry over unchanged.
      const semitones = Math.round(step.pitch / 100);
      const midi = Math.max(0, Math.min(127, PIANO_ROLL_ROOT_MIDI + semitones));
      const detune = step.pitch - semitones * 100;
      const velocity = Math.min(
        MAX_MIDI_VELOCITY,
        Math.max(0, Math.round(step.volume * MAX_MIDI_VELOCITY)),
      );
      const durationTicks =
        step.gateSeconds && step.gateSeconds > 0
          ? Math.max(1, Math.round((step.gateSeconds * bpm * this.ppq) / 60))
          : stepDurationTicks;

      notes.push({
        ticks: index * stepDurationTicks,
        durationTicks,
        midi,
        velocity,
        detune,
        playbackRate: step.playbackRate,
        reverse: step.reverse,
      });
    });

    return notes;
  }

  // Convert the current piano-roll notes into steps so the melody is preserved
  // when switching from piano-roll mode to step mode. Notes are snapped to the
  // nearest step grid position; pitch is encoded as playbackRate (matching the
  // piano-roll playback path); velocity maps to volume; durationTicks → gateSeconds.
  protected notesToSteps(): Step[] {
    const bpm = this.engine.transport.bpm.value || 120;
    const stepDurationSeconds = Time(
      `${this.subdivision}${this.subdivisionType}`,
    ).toSeconds();
    const stepDurationTicks = Math.max(
      1,
      Math.round((stepDurationSeconds * bpm * this.ppq) / 60),
    );

    const maxTick = this.notes.reduce((max, n) => Math.max(max, n.ticks), 0);
    const minStepsNeeded =
      stepDurationTicks > 0 ? Math.ceil(maxTick / stepDurationTicks) + 1 : 0;
    const targetLength = Math.max(this.steps.length, minStepsNeeded, 1);

    const steps: Step[] = Array.from({ length: targetLength }).map(() =>
      normalizeStepData({}),
    );

    this.notes.forEach((note) => {
      const stepIndex =
        stepDurationTicks > 0
          ? Math.round(note.ticks / stepDurationTicks) % targetLength
          : 0;
      // Encode the note's pitch as a cents offset (matching the slice's pitch
      // path); playbackRate/reverse/volume carry straight across.
      const pitchCents =
        (note.midi - PIANO_ROLL_ROOT_MIDI) * 100 + (note.detune ?? 0);
      const gateSeconds =
        note.durationTicks > 0 && bpm > 0
          ? (note.durationTicks / (this.ppq || 192)) * (60 / bpm)
          : undefined;

      steps[stepIndex] = {
        play: true,
        playbackRate: note.playbackRate ?? 1,
        pitch: pitchCents,
        volume: velocityToGain(note.velocity),
        reverse: note.reverse ?? false,
        ...(gateSeconds !== undefined && { gateSeconds }),
      };
    });

    return steps;
  }

  protected syncPart() {
    if (this.mode !== 'pianoroll') {
      if (this.part) {
        this.part.stop();
        this.part.clear();
        this.part.dispose();
        this.part = null;
      }
      return;
    }

    const part = this.ensurePart();
    part.clear();
    this.notes.forEach((note) =>
      part.add({ time: this.ticksToToneTime(note.ticks), note }),
    );
    part.loopEnd = this.ticksToToneTime(this.loopLengthTicks());
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
      const part = this.ensurePart();
      this.syncPart();
      part.start(time ?? 0);
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

  // The musical length of one loop of this pattern, in seconds at the current
  // tempo. Used to size the mixdown render so a beat exports as a full loop.
  loopDurationSeconds() {
    if (this.mode === 'pianoroll') {
      const beats = this.loopLengthTicks() / (this.ppq || 192);
      return beats * (60 / this.engine.transport.bpm.value);
    }
    return (
      this.steps.length *
      Time(`${this.subdivision}${this.subdivisionType}`).toSeconds()
    );
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
      automation: Object.fromEntries(
        Object.entries(this.automation).map(([param, points]) => [
          param,
          (points ?? []).map((point) => ({ ...point })),
        ]),
      ),
    };
  }

  dispose() {
    this.removeAllListeners();
    this.sequence?.dispose();
    this.part?.dispose();
  }
}

// The playback loop length, in ticks: the notes' extent rounded up to whole
// bars, with a one-bar floor. Deriving this from the notes (rather than the
// piano roll's visual duration) keeps the loop musical and never zero — a
// zero-length loop would retrigger the slice at audio rate (a loud buzz).
export const pianoRollLoopLengthTicks = (
  notes: Note[],
  ppq: number,
): number => {
  const ticksPerBar = (ppq || 192) * 4;
  let maxEnd = 0;
  for (const note of notes) {
    maxEnd = Math.max(maxEnd, note.ticks + Math.max(0, note.durationTicks));
  }
  const bars = Math.max(1, Math.ceil(maxEnd / ticksPerBar));
  return bars * ticksPerBar;
};

export const normalizeNoteData = (note: DeepPartial<Note>): Note => ({
  ...(note.id !== undefined && { id: note.id }),
  ticks: note.ticks ?? 0,
  durationTicks: note.durationTicks ?? 0,
  midi: note.midi ?? PIANO_ROLL_ROOT_MIDI,
  velocity: note.velocity ?? DEFAULT_NOTE_VELOCITY,
  ...(note.detune !== undefined && { detune: note.detune }),
  ...(note.playbackRate !== undefined && { playbackRate: note.playbackRate }),
  ...(note.reverse !== undefined && { reverse: note.reverse }),
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
  ...(step.gateSeconds !== undefined && { gateSeconds: step.gateSeconds }),
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
