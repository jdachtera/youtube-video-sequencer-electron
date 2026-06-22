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
  // solid-pianoroll's published types omit the keyboard callbacks (onNoteDown/
  // onNoteUp) that its runtime supports, so cast past them.
  const state = createPianoRollstate({
    ppq: props.pattern.ppq,
    duration: props.pattern.duration,
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
    // Clip length is owned by the Bars control (PatternEditor). We deliberately
    // do NOT forward the roll's internal duration back to the pattern: that
    // round-trip re-mounted the roll and interrupted click/drag edits.
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
