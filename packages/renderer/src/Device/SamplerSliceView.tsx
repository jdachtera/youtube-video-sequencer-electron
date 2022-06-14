import { css } from '@emotion/css';
import { Show } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column, Row } from '../UI/Grid';
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

export const SamplerSliceView = (props: { slice: Slice }) => {
  const sliceState = createStoreFromEventEmitter(
    () => props.slice,
    (slice) => slice.serialize(),
    'change',
  );

  const viewMode = createStoreFromEventEmitter(
    () => props.slice.sampler.engine,
    (engine) => engine.viewMode,
    'viewModeUpdated',
  );

  const currentPlayPosition = createSignalFromEventEmitter(
    () => props.slice,
    (slice) => slice.currentPosition,
    'currentPositionUpdated',
  );

  const toggleCollapse = () => {
    props.slice.set({ collapsed: !sliceState.collapsed });
  };

  return (
    <Column>
      <div
        class={css`
          display: flex;
          margin: 15px 0;
          align-items: center;
          display: ${sliceState.collapsed ? 'flex' : 'none'};
        `}
      >
        <LCD>
          <WaveformSliceView
            slice={props.slice}
            collapsed={!sliceState.collapsed}
            center={1}
            height={30}
            onClickWaveform={() => props.slice.sampler.selectSlice(props.slice)}
          />
        </LCD>
      </div>

      <div
        class={css`
          display: flex;
          align-items: center;
          display: ${sliceState.collapsed ? 'none' : 'flex'};
        `}
      >
        <div
          class={css`
            width: 100%;
            display: flex;
          `}
        >
          <div
            class={css`
              display: flex;
              flex-direction: column;
            `}
          >
            <Column>
              <Column
                class={css`
                  background: radial-gradient(#cfcfcf, #b3b3b3);
                  color: rgb(63, 63, 63);
                  font-size: 20px;
                  border: 3px inset #ffffffac;
                  box-shadow: inset 2px 2px 5px 1px #000000c1;
                  border-radius: 4px;
                  text-shadow: 1px 1px 1px rgba(119, 119, 119, 0.849);
                  padding: 8px;
                `}
              >
                <LCDLabel>Sample</LCDLabel>
                <WaveformSliceView
                  collapsed={sliceState.collapsed}
                  slice={props.slice}
                  center={1}
                  onClickWaveform={() =>
                    props.slice.sampler.selectSlice(props.slice)
                  }
                />

                <Row
                  class={css`
                    justify-content: space-between;
                  `}
                >
                  <Column>
                    <NumberInputWithLabel
                      label="Start"
                      size={12}
                      min={sliceState.end - 10}
                      max={sliceState.end - 0.00001}
                      step={formattedTimeStep}
                      parse={parseFormattedTime}
                      format={formatTime}
                      value={sliceState.start}
                      onChange={(start: number) => props.slice.set({ start })}
                    />
                    <NumberInputWithLabel
                      label="Current Time"
                      disabled
                      size={12}
                      value={currentPlayPosition()}
                      parse={parseFormattedTime}
                      format={formatTime}
                    />
                    <NumberInputWithLabel
                      label="Playback Speed"
                      size={12}
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

                    <div
                      class={css`
                        display: flex;
                        align-items: center;
                      `}
                    >
                      <LCDLabel>Warp Mode</LCDLabel>
                      <SelectWithArrowButtons
                        options={
                          [
                            'resample',
                            'stretch',
                          ] as SerializedSlice['warpmode'][]
                        }
                        size={12}
                        selectedOption={sliceState.warpmode}
                        onChange={(warpmode) => {
                          props.slice.set({ warpmode });
                        }}
                      />
                    </div>
                  </Column>
                  <Column>
                    <NumberInputWithLabel
                      label={'End'}
                      size={12}
                      min={sliceState.start + 0.00001}
                      max={sliceState.start + 10}
                      step={formattedTimeStep}
                      parse={parseFormattedTime}
                      format={formatTime}
                      value={sliceState.end}
                      onChange={(end) => props.slice.set({ end })}
                    />

                    <NumberInputWithLabel
                      label="Volume"
                      size={12}
                      step={0.01}
                      min={0}
                      max={3}
                      format={formatPercentage()}
                      parse={parseFloat}
                      value={sliceState.volume}
                      onChange={(volume) => props.slice.set({ volume })}
                    />
                    <Show when={sliceState.warpmode == 'stretch'}>
                      <NumberInputWithLabel
                        label="Transpose +/-"
                        size={12}
                        min={-2400}
                        max={2400}
                        value={sliceState.pitch}
                        onChange={(pitch) => {
                          props.slice.set({ pitch });
                        }}
                      />
                      <NumberInputWithLabel
                        label="Grain Size"
                        size={12}
                        step={0.00001}
                        min={0.00000000001}
                        max={3}
                        // format={formatPercentage(0)}
                        // parse={parseFloat}
                        value={sliceState.grainSize}
                        onChange={(grainSize) => {
                          props.slice.set({ grainSize });
                        }}
                      />
                    </Show>
                  </Column>
                </Row>
              </Column>
            </Column>
          </div>
          <Column
            class={css`
              padding-left: 10px;
              margin: 20px 0;

              align-items: flex-start;
            `}
          >
            <Column
              class={css`
                align-items: flex-start;
              `}
            >
              <ButtonWithLabel
                label="Export"
                onClick={() => {
                  exportBuffer(
                    props.slice.player.buffer,
                    `${encodeURI(
                      `${props.slice.sampler.title} (${props.slice.start}-${props.slice.end})`,
                    )}.wav`,
                  );
                }}
              />
              <ButtonWithLabel
                activated={sliceState.reverse}
                onClick={() => {
                  props.slice.set({ reverse: !sliceState.reverse });
                }}
                label="Reverse"
              />
              <ButtonWithLabel
                onClick={() => props.slice.sampler.removeSlice(props.slice)}
                label="Delete"
              />

              <ButtonWithLabel
                onClick={() =>
                  props.slice.engine.setCurrentSampler(props.slice.sampler)
                }
                label="Show Sampler"
              />

              <ShareSliceButton slice={props.slice} />

              <div
                class={css`
                  display: flex;
                `}
              >
                <ButtonWithLabel
                  onClick={() => {
                    props.slice.set({
                      playbackRate: sliceState.playbackRate / 2,
                    });
                  }}
                  labelOnButton={true}
                  label="/2"
                />
                <ButtonWithLabel
                  onClick={() => {
                    const bpm = props.slice.sampler.engine.transport.bpm.value;
                    const barDuration = (60 / bpm) * 4;
                    const sliceDuration = sliceState.end - sliceState.start;
                    const targetDuration =
                      Math.round(sliceDuration / barDuration) * barDuration;

                    const playbackSpeed = sliceDuration / targetDuration;

                    props.slice.set({ playbackRate: playbackSpeed });
                  }}
                  labelOnButton={true}
                  label="Align"
                />
                <ButtonWithLabel
                  onClick={() => {
                    props.slice.set({
                      playbackRate: sliceState.playbackRate * 2,
                    });
                  }}
                  labelOnButton={true}
                  label="x2"
                />
              </div>
            </Column>
          </Column>
        </div>
      </div>
    </Column>
  );
};
