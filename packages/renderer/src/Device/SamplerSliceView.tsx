import { css } from '@emotion/css';
import { For, Show } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column } from '../UI/Grid';
import { LCDLabel } from '../UI/LCD';
import { ShareSliceButton } from '../UI/ShareSliceButton';
import { LCD } from '../UI/lcdStyles';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { Slice } from '../engine/device/Slice';
import { exportBuffer } from '../engine/helpers';
import { WaveformSliceView } from './WaveformSliceView';

const panel = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  margin: 4px;
  border-radius: 5px;
  background: linear-gradient(180deg, #c9c9c9, #b0b0b0);
  border: 1px solid rgba(0, 0, 0, 0.3);
  color: #3a3a3a;
  font-size: 12px;
`;

const buttonRow = css`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const sampleSelect = css`
  width: 100%;
  font-family: 'Oswald';
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.3);
  background: #e9e9e9;
  color: #3a3a3a;
  cursor: pointer;
`;

// Thin per-track voice editor: pick which prepared sample this sequencer plays
// and see its waveform. The sound itself (region, speed, warp, reverse, root
// note, …) is shaped in the sampler — "Edit in Sampler" jumps there.
export const SamplerSliceView = (props: { slice: Slice }) => {
  const sliceState = createStoreFromEventEmitter(
    () => props.slice,
    (slice) => slice.serialize(),
    'change',
  );

  // The prepared sample slots, for the "which sample does this sequencer play"
  // dropdown.
  const samplers = createSignalFromEventEmitter(
    () => props.slice.engine,
    (engine) => engine.samplers,
    ['samplersUpdated'],
  );

  const selectSlice = () => props.slice.sampler.selectSlice(props.slice);

  return (
    <Column>
      {/* Collapsed: just a slim waveform strip. */}
      <Show when={sliceState.collapsed}>
        <div
          class={css`
            display: flex;
            margin: 6px 4px;
            align-items: center;
          `}
        >
          <LCD>
            <WaveformSliceView
              slice={props.slice}
              collapsed={!sliceState.collapsed}
              center={1}
              height={30}
              onClickWaveform={selectSlice}
            />
          </LCD>
        </div>
      </Show>

      {/* Expanded: pick the sample + see it; shape the sound in the sampler. */}
      <Show when={!sliceState.collapsed}>
        <div class={panel}>
          <LCDLabel>Sample</LCDLabel>
          {/* Which prepared sample slot this sequencer's voice plays. */}
          <select
            class={sampleSelect}
            onChange={(event) =>
              props.slice.selectSampler(event.currentTarget.value)
            }
          >
            <For each={samplers()}>
              {(sampler) => (
                <option
                  value={sampler.id}
                  selected={sampler.id === sliceState.samplerId}
                >
                  {sampler.title || sampler.url || 'Untitled sample'}
                </option>
              )}
            </For>
          </select>
          <WaveformSliceView
            collapsed={sliceState.collapsed}
            slice={props.slice}
            center={1}
            height={64}
            onClickWaveform={selectSlice}
          />

          <div class={buttonRow}>
            <ButtonWithLabel
              labelOnButton
              onClick={() =>
                props.slice.engine.setCurrentSampler(props.slice.sampler)
              }
              label="Edit in Sampler"
            />
            <ButtonWithLabel
              labelOnButton
              onClick={() => {
                exportBuffer(
                  props.slice.player.buffer,
                  `${encodeURI(
                    `${props.slice.sampler.title} (${props.slice.start}-${props.slice.end})`,
                  )}.wav`,
                );
              }}
              label="Export"
            />
            <ShareSliceButton slice={props.slice} />
          </div>
        </div>
      </Show>
    </Column>
  );
};
