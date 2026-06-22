import { css } from '@emotion/css';
import { PianoRoll, createPianoRollstate, type Track } from 'solid-pianoroll';
import { now } from 'tone';
import type { Pattern } from '../engine/device/Patttern';
import {
  PIANO_ROLL_ROOT_MIDI,
  velocityToGain,
} from '../engine/device/Patttern';

// Melodic editor for a pattern: draw notes that pitch-shift the downstream
// slice, audition a pitch by clicking the on-screen keys, and shape per-note
// expression (velocity/detune/rate/reverse) + time-based automation in the
// lanes below the roll. Bound to the pattern's `notes` + `automation`.
export const PianoRollView = (props: { pattern: Pattern }) => {
  // The clip length (the loop). A bar honours the pattern's time signature. The
  // timeline shows a little extra room past the loop so the brace's right edge
  // can be dragged out to extend the clip, not just shrink it.
  const barTicks = props.pattern.ticksPerBar();
  const loopBars = Math.max(1, Math.round(props.pattern.duration / barTicks));
  const headroomBars = Math.min(4, Math.max(1, Math.round(loopBars / 4)));
  const viewDurationTicks = (loopBars + headroomBars) * barTicks;

  // solid-pianoroll's published types omit the keyboard callbacks (onNoteDown/
  // onNoteUp) that its runtime supports, so cast past them.
  const state = createPianoRollstate({
    ppq: props.pattern.ppq,
    // Timeline range = loop + headroom; the loop brace marks the real clip end.
    duration: viewDurationTicks,
    loopEnd: props.pattern.duration,
    loopStart: props.pattern.loopStart,
    // Bar grid + brace snap follow the pattern's time signature.
    beatsPerBar: props.pattern.timeSignatureNumerator,
    beatUnit: props.pattern.timeSignatureDenominator,
    mode: 'keys',
    // Fit the whole clip to the (small, embedded) view with a couple of octaves
    // of keys, instead of the library's heavily zoomed-in demo defaults.
    zoom: 1,
    position: 0,
    verticalZoom: 2,
    verticalPosition: 48,
    // 16th-note snap (DAW-style) instead of the previous quarter-note grid.
    gridDivision: 16,
    snapToGrid: true,
    tracks: [
      {
        name: props.pattern.name || 'Notes',
        color: props.pattern.color || '#ff9100',
        notes: props.pattern.notes,
        automation: props.pattern.automation,
      },
    ],
    onTracksChange: (tracks: Track[]) => {
      // notes + automation share one store; persist both on any roll edit.
      props.pattern.set({
        notes: tracks[0]?.notes ?? [],
        automation: tracks[0]?.automation ?? {},
      });
    },
    // Audition the pitched slice when an on-screen key is pressed — same pitch
    // (cents) + volume mapping the playback Part uses, routed through the
    // sequencer so it hits the bound voice.
    onNoteDown: (_trackIndex: number, keyNumber: number) => {
      const pitchCents = (keyNumber - PIANO_ROLL_ROOT_MIDI) * 100;
      props.pattern.sequencer.onSequenceEvent(now(), {
        play: true,
        volume: velocityToGain(undefined),
        playbackRate: 1,
        pitch: pitchCents,
        reverse: false,
        gateSeconds: 0.5,
      });
    },
    // Dragging the loop brace's right edge commits a new clip length here (once,
    // on release — it snaps to the bar, like the Bars control). Note edits go
    // through onTracksChange and never touch duration, so they don't remount.
    onLoopEndChange: (loopEnd: number) => {
      props.pattern.set({ duration: Math.max(barTicks, Math.round(loopEnd)) });
    },
    // Dragging the brace's left edge moves the loop start (where playback loops
    // back to), clamped to leave at least one bar.
    onLoopStartChange: (loopStart: number) => {
      props.pattern.set({
        loopStart: Math.max(
          0,
          Math.min(Math.round(loopStart), props.pattern.duration - barTicks),
        ),
      });
    },
  } as unknown as Parameters<typeof createPianoRollstate>[0]);

  return (
    <div
      class={css`
        width: 760px;
        max-width: 100%;
        height: 500px;
        background: #2b2b2b;
        border-radius: 4px;
        overflow: hidden;
      `}
    >
      <PianoRoll
        {...state}
        showTrackList={false}
        showExpressionLane={true}
        showAutomationLane={true}
        style={{ height: '500px', width: '100%' }}
      />
    </div>
  );
};
