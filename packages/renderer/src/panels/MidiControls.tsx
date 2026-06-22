import { css } from '@emotion/css';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Row } from '../UI/Grid';
import { SelectWithArrowButtons } from '../UI/SelectWithArrowButtons';
import type { Engine } from '../engine/Engine';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';

// MIDI channels: 0 = Omni (all), 1..16 = a specific channel.
const channelOptions = Array.from({ length: 17 }, (_, index) => index);

// Compact MIDI-input controls for the toolbar: record-arm, input device,
// channel filter, and the target track that receives played/recorded notes.
// Only shown once Web MIDI access has been granted.
export const MidiControls = (props: { engine: Engine }) => {
  const midi = createStoreFromEventEmitter(
    () => props.engine.midiInput,
    (input) => ({
      enabled: input.enabled,
      inputs: input.inputs,
      selectedInputId: input.selectedInputId,
      channel: input.channel,
      targetTrackIndex: input.targetTrackIndex,
      recording: input.recording,
    }),
    [
      'enabledUpdated',
      'inputsUpdated',
      'selectedInputIdUpdated',
      'channelUpdated',
      'targetTrackIndexUpdated',
      'recordingUpdated',
    ],
  );

  const trackOptions = createSignalFromEventEmitter(
    () => props.engine,
    (engine) => engine.tracks.map((_, index) => index),
    ['trackAdded', 'trackRemoved', 'change'],
  );

  // Flash an activity LED on note-on.
  const [active, setActive] = createSignal(false);
  let activityTimer: ReturnType<typeof setTimeout> | undefined;
  const onActivity = (_midi: number, on: boolean) => {
    if (!on) return;
    setActive(true);
    if (activityTimer) clearTimeout(activityTimer);
    activityTimer = setTimeout(() => setActive(false), 120);
  };
  onMount(() => props.engine.midiInput.on('activity', onActivity));
  onCleanup(() => {
    props.engine.midiInput.off('activity', onActivity);
    if (activityTimer) clearTimeout(activityTimer);
  });

  return (
    <Show when={midi.enabled}>
      <Row
        classList={{
          [css`
            zoom: 0.6;
            align-items: center;
            gap: 2px;
            label {
              color: white;
            }
          `]: true,
        }}
      >
        <span
          title={active() ? 'MIDI activity' : 'MIDI'}
          class={css`
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin: 0 4px;
            background: ${active() ? '#46d323' : '#444'};
            box-shadow: ${active() ? '0 0 6px #46d323' : 'none'};
          `}
        />
        <ButtonWithLabel
          type="button"
          label={'● REC'}
          labelOnButton={true}
          activated={midi.recording}
          activatedColor={'#e23b2b'}
          title="Arm MIDI recording (overdubs into the target track while playing)"
          onClick={() => props.engine.midiInput.setRecording(!midi.recording)}
        />
        <SelectWithArrowButtons
          label={'MIDI In'}
          size={7}
          options={midi.inputs.map((input) => input.id)}
          selectedOption={midi.selectedInputId ?? ''}
          optionLabel={(id) =>
            midi.inputs.find((input) => input.id === id)?.name ?? '—'
          }
          onChange={(id) => props.engine.midiInput.setSelectedInput(id)}
        />
        <SelectWithArrowButtons
          label={'Ch'}
          size={3}
          options={channelOptions}
          selectedOption={midi.channel}
          optionLabel={(channel) => (channel === 0 ? 'Omni' : `${channel}`)}
          onChange={(channel) => props.engine.midiInput.setChannel(channel)}
        />
        <SelectWithArrowButtons
          label={'→ Track'}
          size={4}
          options={trackOptions()}
          selectedOption={midi.targetTrackIndex}
          optionLabel={(index) => `${index + 1}`}
          onChange={(index) =>
            props.engine.midiInput.setTargetTrackIndex(index)
          }
        />
      </Row>
    </Show>
  );
};
