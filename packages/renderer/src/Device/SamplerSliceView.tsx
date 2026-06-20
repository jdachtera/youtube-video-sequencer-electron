import { css } from '@emotion/css';
import { Show } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column } from '../UI/Grid';
import { NumberInputWithLabel } from '../UI/Knob';
import { LCDLabel } from '../UI/LCD';
import { SelectWithArrowButtons } from '../UI/SelectWithArrowButtons';
import { ShareSliceButton } from '../UI/ShareSliceButton';
import {
  parseFormattedTime,
  formatTime,
  formatPercentage,
  formattedTimeStep,
} from '../UI/format';
import { LCD } from '../UI/lcdStyles';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { SerializedSlice, Slice } from '../engine/device/Slice';
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

const controlsGrid = css`
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  justify-items: start;
  gap: 4px 12px;
`;

const inlineControl = css`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const buttonRow = css`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

export const SamplerSliceView = (props: { slice: Slice }) => {
  const sliceState = createStoreFromEventEmitter(
    () => props.slice,
    (slice) => slice.serialize(),
    'change',
  );

  const currentPlayPosition = createSignalFromEventEmitter(
    () => props.slice,
    (slice) => slice.currentPosition,
    'currentPositionUpdated',
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

      {/* Expanded: compact editor. */}
      <Show when={!sliceState.collapsed}>
        <div class={panel}>
          <LCDLabel>Sample</LCDLabel>
          <WaveformSliceView
            collapsed={sliceState.collapsed}
            slice={props.slice}
            center={1}
            height={64}
            onClickWaveform={selectSlice}
          />

          <div class={controlsGrid}>
            <NumberInputWithLabel
              label="Start"
              size={8}
              min={sliceState.end - 10}
              max={sliceState.end - 0.00001}
              step={formattedTimeStep}
              parse={parseFormattedTime}
              format={formatTime}
              value={sliceState.start}
              onChange={(start: number) => props.slice.set({ start })}
            />
            <NumberInputWithLabel
              label="End"
              size={8}
              min={sliceState.start + 0.00001}
              max={sliceState.start + 10}
              step={formattedTimeStep}
              parse={parseFormattedTime}
              format={formatTime}
              value={sliceState.end}
              onChange={(end) => props.slice.set({ end })}
            />
            <NumberInputWithLabel
              label="Pos"
              disabled
              size={8}
              value={currentPlayPosition()}
              parse={parseFormattedTime}
              format={formatTime}
            />
            <NumberInputWithLabel
              label="Volume"
              size={6}
              step={0.01}
              min={0}
              max={3}
              format={formatPercentage()}
              parse={parseFloat}
              value={sliceState.volume}
              onChange={(volume) => props.slice.set({ volume })}
            />
            <NumberInputWithLabel
              label="Speed"
              size={6}
              step={0.01}
              min={0}
              max={3}
              format={formatPercentage(0)}
              parse={parseFloat}
              value={sliceState.playbackRate}
              onChange={(playbackRate) => {
                props.slice.set({ playbackRate });
              }}
            />
            <div class={inlineControl}>
              <LCDLabel>Warp</LCDLabel>
              <SelectWithArrowButtons
                options={
                  ['resample', 'stretch'] as SerializedSlice['warpmode'][]
                }
                size={9}
                selectedOption={sliceState.warpmode}
                onChange={(warpmode) => {
                  props.slice.set({ warpmode });
                }}
              />
            </div>
            <Show when={sliceState.warpmode === 'stretch'}>
              <NumberInputWithLabel
                label="Transpose"
                size={6}
                min={-2400}
                max={2400}
                value={sliceState.pitch}
                onChange={(pitch) => {
                  props.slice.set({ pitch });
                }}
              />
              <NumberInputWithLabel
                label="Grain"
                size={6}
                step={0.00001}
                min={0.00000000001}
                max={3}
                value={sliceState.grainSize}
                onChange={(grainSize) => {
                  props.slice.set({ grainSize });
                }}
              />
            </Show>
          </div>

          <div class={buttonRow}>
            <ButtonWithLabel
              activated={sliceState.reverse}
              labelOnButton
              onClick={() => props.slice.set({ reverse: !sliceState.reverse })}
              label="Reverse"
            />
            <ButtonWithLabel
              labelOnButton
              onClick={() =>
                props.slice.set({ playbackRate: sliceState.playbackRate / 2 })
              }
              label="/2"
            />
            <ButtonWithLabel
              labelOnButton
              onClick={() => {
                const bpm = props.slice.sampler.engine.transport.bpm.value;
                const barDuration = (60 / bpm) * 4;
                const sliceDuration = sliceState.end - sliceState.start;
                const targetDuration =
                  Math.round(sliceDuration / barDuration) * barDuration;
                props.slice.set({
                  playbackRate: sliceDuration / targetDuration,
                });
              }}
              label="Align"
            />
            <ButtonWithLabel
              labelOnButton
              onClick={() =>
                props.slice.set({ playbackRate: sliceState.playbackRate * 2 })
              }
              label="x2"
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
            <ButtonWithLabel
              labelOnButton
              onClick={() =>
                props.slice.engine.setCurrentSampler(props.slice.sampler)
              }
              label="Sampler"
            />
            <ShareSliceButton slice={props.slice} />
            <ButtonWithLabel
              labelOnButton
              onClick={() => props.slice.sampler.removeSlice(props.slice)}
              label="Delete"
            />
          </div>
        </div>
      </Show>
    </Column>
  );
};
