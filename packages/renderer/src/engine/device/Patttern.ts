import type { Automation, Note } from 'solid-pianoroll';
import { automationValueAtTicks } from 'solid-pianoroll';
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
  // Loop start (ticks) within the clip — the loop plays [loopStart, duration].
  loopStart: number;
  // Time signature: a bar is `timeSignatureNumerator` beats, each a
  // 1/`timeSignatureDenominator` note. Drives bar length (Bars control, loop
  // snap, roll grid). Defaults to 4/4.
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  // Time-based automation curves (volume/detune/playbackRate breakpoints),
  // edited in the piano roll's automation lane. Keyed by parameter.
  automation: Automation;
};

// MIDI note the sample plays back at its natural pitch (C4). Notes above pitch
// up, notes below pitch down.
export const PIANO_ROLL_ROOT_MIDI = 60;

// Piano-roll notes carry a MIDI-style velocity (0–127, the editor draws new
// notes at 100). The engine's voice gain is a 0–1 multiplier, though, so a raw
// velocity fed in as `volume` played ~100× too loud. Normalize on the way in.
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

// Ticks spanned by one step-grid cell, in a pattern's own ppq. Tempo
// independent: a 1/`subdivision` note is `ppq*4/subdivision` ticks, scaled for
// triplet ('t') / dotted ('n.') feels.
const stepLengthTicks = (
  ppq: number,
  subdivision: number,
  subdivisionType: typeof subdivisionTypes[number],
): number => {
  const base = (ppq * 4) / (subdivision || 16);
  const factor =
    subdivisionType === 't' ? 2 / 3 : subdivisionType === 'n.' ? 3 / 2 : 1;
  return Math.max(1, Math.round(base * factor));
};

// Project a note onto a step-grid cell (the quantized view the step sequencer
// renders). Inverse of stepToNote.
const noteToStep = (note: Note, ppq: number, bpm: number): Step => {
  const pitchCents =
    (note.midi - PIANO_ROLL_ROOT_MIDI) * 100 + (note.detune ?? 0);
  const gateSeconds =
    note.durationTicks > 0 && bpm > 0
      ? (note.durationTicks / (ppq || 192)) * (60 / bpm)
      : undefined;
  return {
    play: true,
    playbackRate: note.playbackRate ?? 1,
    pitch: pitchCents,
    volume: velocityToGain(note.velocity),
    reverse: note.reverse ?? false,
    ...(gateSeconds !== undefined && { gateSeconds }),
  };
};

// Build a note from a step-grid cell at `ticks`. `existing` preserves a note's
// id/position when a grid edit only changes a field. Inverse of noteToStep.
const stepToNote = (
  step: Step,
  ticks: number,
  fallbackDurationTicks: number,
  ppq: number,
  bpm: number,
  existing?: Note,
): Note => {
  const semitones = Math.round(step.pitch / 100);
  const midi = Math.max(0, Math.min(127, PIANO_ROLL_ROOT_MIDI + semitones));
  const detune = step.pitch - semitones * 100;
  const velocity = Math.min(
    MAX_MIDI_VELOCITY,
    Math.max(0, Math.round(step.volume * MAX_MIDI_VELOCITY)),
  );
  const durationTicks =
    step.gateSeconds && step.gateSeconds > 0 && bpm > 0
      ? Math.max(1, Math.round((step.gateSeconds * bpm * ppq) / 60))
      : existing?.durationTicks ?? fallbackDurationTicks;
  return {
    ...(existing?.id !== undefined && { id: existing.id }),
    ticks: existing ? existing.ticks : ticks,
    durationTicks,
    midi,
    velocity,
    detune,
    playbackRate: step.playbackRate,
    reverse: step.reverse,
  };
};

type PatternEvents = {
  change: (pattern: Pattern) => void;
};

/**
 * A pattern's notes are the single source of truth. Two schedulers play them
 * back and stay editable while the transport runs:
 *
 * - Step mode: a Tone.Sequence whose events are the *derived* step grid
 *   (a quantized projection of the notes — see `deriveSteps`). Note edits swap
 *   the events in place; changing the cell count or subdivision rebuilds the
 *   sequence (Tone.Sequence's length/subdivision are constructor-only), aligned
 *   to the transport so the channel doesn't drop out. The sequence also owns
 *   looping and the per-schedule start offset pattern-chaining relies on.
 * - Piano-roll mode: a single long-lived Tone.Part fed the notes directly,
 *   refreshed in place (clear + re-add) on edits, never disposed mid-play.
 *
 * The step grid is a read-only *view* of the notes, so the sequencer and the
 * piano roll always show the same melody with no conversion. Switching mode
 * only swaps the active scheduler.
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
  subdivision = 16;
  subdivisionType: typeof subdivisionTypes[number] = 'n';
  followupAction?: FollowupAction;

  // Single source of truth. The step grid is a derived, quantized *view* of
  // these notes (see `steps`).
  mode: PatternMode = 'steps';
  notes: Note[] = [];
  ppq = 192;
  duration = 192 * 16;
  loopStart = 0;
  timeSignatureNumerator = 4;
  timeSignatureDenominator = 4;
  automation: Automation = {};

  // The step grid: a quantized projection of `notes` onto evenly spaced cells.
  // Read-only — edits go through setStep/setLength/rotate, which mutate `notes`.
  get steps(): Step[] {
    return this.deriveSteps();
  }

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
      : (() => {
          const subdivision = pattern.subdivision ?? 16;
          const subdivisionType = pattern.subdivisionType ?? 'n';
          const ppq = pattern.ppq ?? 192;
          const steps = (pattern.steps ?? []).map((step) =>
            normalizeStepData(step),
          );
          // Notes are canonical. Old projects stored only `steps`; migrate them
          // to notes once on load so the single-source-of-truth model holds.
          const hasNotes = Array.isArray(pattern.notes) && pattern.notes.length;
          const notes = hasNotes
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              pattern.notes!.map((note) => normalizeNoteData(note))
            : migrateStepsToNotes(steps, ppq, subdivision, subdivisionType);
          const stepLen = stepLengthTicks(ppq, subdivision, subdivisionType);
          const duration =
            pattern.duration ??
            (steps.length ? steps.length * stepLen : 192 * 16);
          return {
            name: pattern.name ?? '',
            color: pattern.color ?? randomColor(),
            followupAction: normalizeFollowupActionData(pattern.followupAction),
            subdivision,
            subdivisionType,
            steps,
            mode: pattern.mode === 'pianoroll' ? 'pianoroll' : 'steps',
            notes,
            ppq,
            duration,
            loopStart: pattern.loopStart ?? 0,
            timeSignatureNumerator: pattern.timeSignatureNumerator ?? 4,
            timeSignatureDenominator: pattern.timeSignatureDenominator ?? 4,
            automation: (pattern.automation as Automation) ?? {},
          };
        })();

  set(patternPartial: Partial<SerializedPattern>) {
    entries(patternPartial).forEach((entry) => {
      if (!entry) return;

      switch (entry[0]) {
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
          // No conversion: both views read the same `notes`. Mode only swaps the
          // active scheduler — stop the sequence, (re)build the part for the
          // piano roll or refresh the sequence for the grid.
          this.sequence?.stop();
          this.syncPart();
          if (this.mode !== 'pianoroll') this.refreshSequence();
          if (
            this.engine.transport.state === 'started' &&
            this.sequencer.getPattern() === this
          ) {
            this.start();
          }
          break;
        case 'notes':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.notes = entry[1]!;
          // Live-update whichever scheduler is active. The step grid is a
          // derived view, so a note edit refreshes the sequence too.
          if (this.mode === 'pianoroll') this.syncPart();
          else this.refreshSequence();
          break;
        case 'ppq':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.ppq = entry[1]!;
          if (this.mode === 'pianoroll') this.syncPart();
          else this.refreshSequence();
          break;
        case 'duration':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.duration = entry[1]!;
          // Clip length == loop end. In the roll it refreshes the loop bounds;
          // in the grid it changes the derived cell count.
          if (this.mode === 'pianoroll') this.syncPart();
          else this.refreshSequence();
          break;
        case 'loopStart':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.loopStart = entry[1]!;
          if (this.mode === 'pianoroll') this.syncPart();
          break;
        case 'timeSignatureNumerator':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.timeSignatureNumerator = entry[1]!;
          if (this.mode === 'pianoroll') this.syncPart();
          break;
        case 'timeSignatureDenominator':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.timeSignatureDenominator = entry[1]!;
          if (this.mode === 'pianoroll') this.syncPart();
          break;
        case 'automation':
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.automation = entry[1]!;
          // Re-apply to the active scheduler so the curve takes effect now.
          if (this.mode === 'pianoroll') this.syncPart();
          else this.refreshSequence();
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
      events: this.deriveStepsForPlayback(),
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

  // Ticks per step-grid cell, in this pattern's ppq.
  stepDurationTicks() {
    return stepLengthTicks(this.ppq, this.subdivision, this.subdivisionType);
  }

  // Number of step-grid cells: the loop length (duration) divided into cells.
  slotCount() {
    return Math.max(1, Math.round(this.duration / this.stepDurationTicks()));
  }

  // The quantized step-grid view of `notes`: each note lands in the nearest
  // cell (later notes in a shared cell win — the slice is monophonic).
  deriveSteps(): Step[] {
    const stepLen = this.stepDurationTicks();
    const count = this.slotCount();
    const bpm = this.engine.transport.bpm.value || 120;
    const steps: Step[] = Array.from({ length: count }, () =>
      normalizeStepData({}),
    );
    for (const note of this.notes) {
      const slot = Math.round(note.ticks / stepLen);
      if (slot < 0 || slot >= count) continue;
      steps[slot] = noteToStep(note, this.ppq, bpm);
    }
    return steps;
  }

  private hasAutomation() {
    const a = this.automation;
    return !!(a.volume?.length || a.detune?.length || a.playbackRate?.length);
  }

  // The grid as actually played: the derived steps with the automation curves
  // folded in (volume scaled, pitch detuned, rate scaled) at each cell's time.
  // Kept separate from `deriveSteps` so the editor grid still shows the raw
  // note values, not the automation-modulated ones.
  private deriveStepsForPlayback(): Step[] {
    const steps = this.deriveSteps();
    if (!this.hasAutomation()) return steps;
    const stepLen = this.stepDurationTicks();
    const a = this.automation;
    return steps.map((step, index) => {
      if (!step.play) return step;
      const ticks = index * stepLen;
      return {
        ...step,
        volume: step.volume * automationValueAtTicks(a.volume, ticks, 1),
        pitch: step.pitch + automationValueAtTicks(a.detune, ticks, 0),
        playbackRate:
          step.playbackRate * automationValueAtTicks(a.playbackRate, ticks, 1),
      };
    });
  }

  // Re-point the step sequence at the freshly derived grid, rebuilding only when
  // the cell count changed (Tone.Sequence length is fixed at construction).
  protected refreshSequence() {
    const steps = this.deriveStepsForPlayback();
    if (!this.sequence) {
      this.createSequence();
      return;
    }
    if (this.sequence.length !== steps.length) {
      this.createSequence();
    } else {
      this.sequence.events = steps;
    }
  }

  // Apply a step-grid edit by mutating the underlying note for that cell:
  // toggling off deletes the note, toggling on adds one, and a field change
  // updates the existing note (keeping its id + exact position).
  setStep(index: number, step: Step) {
    const stepLen = this.stepDurationTicks();
    const bpm = this.engine.transport.bpm.value || 120;
    const existingIndex = this.notes.findIndex(
      (note) => Math.round(note.ticks / stepLen) === index,
    );
    const existing = existingIndex >= 0 ? this.notes[existingIndex] : undefined;

    let notes: Note[];
    if (!step.play) {
      if (existingIndex < 0) return; // already empty
      notes = [
        ...this.notes.slice(0, existingIndex),
        ...this.notes.slice(existingIndex + 1),
      ];
    } else {
      const note = stepToNote(
        step,
        index * stepLen,
        stepLen,
        this.ppq,
        bpm,
        existing,
      );
      if (existingIndex >= 0) {
        notes = [
          ...this.notes.slice(0, existingIndex),
          note,
          ...this.notes.slice(existingIndex + 1),
        ];
      } else {
        notes = [...this.notes, note].sort((a, b) => a.ticks - b.ticks);
      }
    }

    this.set({ notes });
  }

  // Rotate the melody by whole grid cells, wrapping within the loop.
  rotate(direction: number) {
    const stepLen = this.stepDurationTicks();
    const span = this.slotCount() * stepLen;
    const shift = direction * stepLen;
    const notes = this.notes.map((note) => ({
      ...note,
      ticks: (((note.ticks + shift) % span) + span) % span,
    }));
    this.set({ notes });
  }

  // Duplicate the melody after itself, doubling the loop length.
  duplicate() {
    const offset = this.duration;
    const copies = this.notes.map((note) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _omit, ...rest } = note;
      return { ...rest, ticks: note.ticks + offset };
    });
    this.set({
      duration: this.duration * 2,
      notes: [...this.notes, ...copies],
    });
  }

  // Build notes from a step array (e.g. the grid randomizer), replacing the
  // melody. Cells that aren't playing produce no note.
  stepsToNotes(steps: Step[]): Note[] {
    const stepLen = this.stepDurationTicks();
    const bpm = this.engine.transport.bpm.value || 120;
    const notes: Note[] = [];
    steps.forEach((step, index) => {
      if (!step.play) return;
      notes.push(stepToNote(step, index * stepLen, stepLen, this.ppq, bpm));
    });
    return notes;
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

  // Ticks in one bar at this pattern's time signature.
  ticksPerBar() {
    const num = this.timeSignatureNumerator || 4;
    const den = this.timeSignatureDenominator || 4;
    return (num * (this.ppq || 192) * 4) / den;
  }

  protected loopLengthTicks() {
    // The piano-roll clip length is explicit — the editor's duration (set via
    // the Length/Bars control) — so the loop is exactly that length, floored to
    // one bar so it's never zero. Notes past the clip end simply aren't looped.
    const ticksPerBar = this.ticksPerBar();
    return Math.max(ticksPerBar, Math.round(this.duration) || ticksPerBar);
  }

  // Where the loop begins, clamped to leave at least one bar of loop.
  protected loopStartTicks() {
    return Math.max(
      0,
      Math.min(this.loopStart, this.loopLengthTicks() - this.ticksPerBar()),
    );
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
      // Fold in the automation curves, sampled at the note's start.
      const a = this.automation;
      this.sequencer.onSequenceEvent(time, {
        play: true,
        volume:
          velocityToGain(note.velocity) *
          automationValueAtTicks(a.volume, note.ticks, 1),
        playbackRate:
          (note.playbackRate ?? 1) *
          automationValueAtTicks(a.playbackRate, note.ticks, 1),
        pitch: pitchCents + automationValueAtTicks(a.detune, note.ticks, 0),
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
    // Loop window [loopStart, loopEnd]. loopStart must be set before loopEnd so
    // Tone doesn't transiently see start >= end.
    part.loopStart = this.ticksToToneTime(this.loopStartTicks());
    part.loopEnd = this.ticksToToneTime(this.loopLengthTicks());
  }

  // The "Steps" control sets the number of grid cells, which (with the
  // subdivision) defines the loop length. Notes past the new end aren't looped.
  setLength(newLength: number) {
    this.set({
      duration: Math.max(1, Math.round(newLength)) * this.stepDurationTicks(),
    });
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
      this.slotCount() *
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
      // Derived snapshot of the grid, kept in the payload for backward compat;
      // `notes` is the source of truth on reload.
      steps: this.deriveSteps().map((step) => ({ ...step })),
      mode: this.mode,
      notes: this.notes.map((note) => ({ ...note })),
      ppq: this.ppq,
      duration: this.duration,
      loopStart: this.loopStart,
      timeSignatureNumerator: this.timeSignatureNumerator,
      timeSignatureDenominator: this.timeSignatureDenominator,
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

// One-time migration for old projects that stored only `steps`: project each
// playing cell to a note (tempo-independent, in ticks). Pitch splits into an
// integer midi + fine detune; volume → velocity; playbackRate/reverse carry.
export const migrateStepsToNotes = (
  steps: Step[],
  ppq: number,
  subdivision: number,
  subdivisionType: typeof subdivisionTypes[number],
): Note[] => {
  const stepLen = stepLengthTicks(ppq, subdivision, subdivisionType);
  const notes: Note[] = [];
  steps.forEach((step, index) => {
    if (!step.play) return;
    const pitch = step.pitch ?? 0;
    const semitones = Math.round(pitch / 100);
    notes.push({
      ticks: index * stepLen,
      durationTicks: stepLen,
      midi: Math.max(0, Math.min(127, PIANO_ROLL_ROOT_MIDI + semitones)),
      velocity: Math.min(
        MAX_MIDI_VELOCITY,
        Math.max(0, Math.round((step.volume ?? 1) * MAX_MIDI_VELOCITY)),
      ),
      detune: pitch - semitones * 100,
      playbackRate: step.playbackRate ?? 1,
      reverse: step.reverse ?? false,
    });
  });
  return notes;
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
