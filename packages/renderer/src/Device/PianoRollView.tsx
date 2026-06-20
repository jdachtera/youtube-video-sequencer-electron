import { css } from '@emotion/css';
import { PianoRoll, createPianoRollstate } from 'solid-pianoroll';
import type { Pattern } from '../engine/device/Patttern';

// Melodic editor for a pattern: draw notes that pitch-shift the downstream
// slice. Bound to the pattern's `notes`; edits are pushed back through
// `set({ notes })`, which rebuilds the playback Part.
export const PianoRollView = (props: { pattern: Pattern }) => {
  const state = createPianoRollstate({
    ppq: props.pattern.ppq,
    duration: props.pattern.duration,
    gridDivision: 4,
    snapToGrid: true,
    tracks: [
      {
        name: props.pattern.name || 'Notes',
        color: props.pattern.color || '#ff9100',
        notes: props.pattern.notes,
      },
    ],
    onTracksChange: (tracks) => {
      props.pattern.set({ notes: tracks[0]?.notes ?? [] });
    },
    onDurationChange: (duration) => {
      props.pattern.set({ duration });
    },
  });

  return (
    <div
      class={css`
        width: 760px;
        max-width: 100%;
        height: 300px;
        background: #2b2b2b;
        border-radius: 4px;
        overflow: hidden;
      `}
    >
      <PianoRoll
        {...state}
        showTrackList={false}
        style={{ height: '300px', width: '100%' }}
      />
    </div>
  );
};
