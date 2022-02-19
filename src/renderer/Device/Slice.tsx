import { createMemo, untrack } from 'solid-js';

import { css } from 'renderer/emotion-solid';

import {
  LCDLabel,
  LCD,
  ButtonWithLabel,
  RackEar,
  DeviceWrapper,
  InputLCD,
} from '../UI';

import { WavesurferSliceView } from './WavesurferSliceView';

import type { Slice } from '../engine/device/Slice';
import { MoogKnobWithLabel, NumberInput } from '../controls/Knob';

import { ShareSliceButton } from '../ShareSliceButton';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../createSignalFromEventEmitter';
import { SlicePattern } from '../PatternEditor';
import { DeviceChainView } from './DeviceChainView';
import { Row } from 'renderer/Grid';
import { exportBuffer } from 'renderer/engine/helpers';

export const SampleSlice = (props: {
  slice: Slice;
  currentPatternIndex: number;
  isSelected: boolean;
  onClickSlice: (slice: Slice) => void;
  onRemoveSlice: (slice: Slice) => void;
}) => {
  const sliceState = createStoreFromEventEmitter(
    untrack(() => props.slice),
    'change',
    (slice) => slice.serialize()
  );

  const viewMode = createSignalFromEventEmitter(
    () => props.slice.chain.engine,
    'viewModeUpdated',
    (engine) => engine.viewMode
  );

  const currentPlayPosition = createSignalFromEventEmitter(
    untrack(() => props.slice),
    'currentPositionUpdated',
    (slice) => slice.currentPosition
  );

  const currentPattern = createMemo(
    () => sliceState.patterns[props.currentPatternIndex]
  );

  const handleUpdateSampleStart = (start: number) => {
    props.slice.set({
      start: Math.min(sliceState.end + 0.00001, start),
    });
  };

  const handleUpdateSampleEnd = (end: number) => {
    props.slice.set({
      end: Math.max(sliceState.start + 0.00001, end),
    });
  };

  const handleUpdatePatternLength = (patternLength: number) => {
    props.slice.updatePatternLength(props.currentPatternIndex, patternLength);
  };

  const toggleCollapse = () => {
    props.slice.set({
      collapsed: sliceState.collapsed ? false : true,
    });
  };

  return (
    <li
      classList={{
        'slice-active': props.isSelected,
      }}
      class={css`
        display: flex;
        align-items: center;
        padding: 0;
        margin: 0;
        overflow-x: auto;
      `}
    >
      <DeviceWrapper
        onClickLeftRackEar={toggleCollapse}
        background={sliceState.color}
      >
        <Row
          classList={{
            [css`
              flex: 1;
            `]: true,
            [css`
              height: 430px;
            `]: !sliceState.collapsed,
          }}
        >
          <InputLCD
            classList={{
              [css`
                width: 150px;
                white-space: nowrap;
                text-overflow: ellipsis;
              `]: true,
            }}
            value={sliceState.name}
            onInput={(event) => {
              props.slice.set({ name: event.currentTarget.value });
            }}
          />
          <ButtonWithLabel
            label="Solo"
            activated={sliceState.solo}
            labelOnButton={true}
            onClick={(event) => {
              props.slice.setSolo(!sliceState.solo, event.altKey);
            }}
          />
          <ButtonWithLabel
            label="Mute"
            activated={sliceState.mute}
            labelOnButton={true}
            onClick={() => {
              props.slice.set({ mute: !sliceState.mute });
            }}
          />
        </Row>
      </DeviceWrapper>
      <div
        classList={{
          [css`
            box-shadow: 0px 0px 2px inset #222;
            border-radius: 4px;
            margin-bottom: 2px;
            background-color: ${sliceState.color};
            transition: all 2s ease;
          `]: true,
          [css`
            display: none;
          `]: !viewMode().sliceControls,
        }}
      >
        <div
          class={css`
            display: flex;
            width: 100%;
          `}
        >
          <RackEar collapsed={sliceState.collapsed} onClick={toggleCollapse} />

          <div
            class={css`
              display: flex;
              flex-direction: column;
              width: 100%;
              padding: 20px 0;
            `}
          >
            <div
              class={css`
                display: flex;
                align-items: center;
                display: ${sliceState.collapsed ? 'flex' : 'none'};
              `}
            >
              <LCD>
                <WavesurferSliceView
                  slice={props.slice}
                  center={1}
                  height={30}
                  currentTime={currentPlayPosition()}
                  onClickWaveform={() => props.onClickSlice(props.slice)}
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
                  padding: 8px;
                `}
              >
                <div
                  class={css`
                    display: flex;
                    flex-direction: column;
                    padding: 2px;
                  `}
                >
                  <div
                    class={css`
                      display: flex;
                      flex-direction: column;
                    `}
                  >
                    <div
                      class={css`
                        display: flex;
                        flex-direction: column;
                        background: radial-gradient(#cfcfcf, #b3b3b3);
                        color: rgb(63, 63, 63);
                        font-size: 20px;
                        border: 3px inset #ffffffac;
                        box-shadow: inset 2px 2px 5px 1px #000000c1;
                        border-radius: 4px;
                        text-shadow: 1px 1px 1px rgba(119, 119, 119, 0.849);
                        padding: 8px;
                        margin-right: 20px;
                        margin-left: 20px;
                      `}
                    >
                      <LCDLabel>Sample</LCDLabel>
                      <WavesurferSliceView
                        slice={props.slice}
                        center={1}
                        currentTime={currentPlayPosition()}
                        onClickWaveform={() => props.onClickSlice(props.slice)}
                      />
                      <div
                        class={css`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <LCDLabel>Name</LCDLabel>
                        <input
                          onChange={(event) => {
                            props.slice.set({
                              name: event.currentTarget.value,
                            });
                          }}
                          class={css`
                            background: none;
                            border: none;
                            font-family: '7seg';
                            color: #444;
                          `}
                          value={sliceState.name}
                        />
                      </div>
                      <div
                        class={css`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <LCDLabel>Steps</LCDLabel>
                        <NumberInput
                          label="steps"
                          step={1}
                          min={1}
                          max={1024}
                          speed={0.1}
                          fineIsDefault
                          value={currentPattern()?.steps?.length}
                          onInput={handleUpdatePatternLength}
                        />
                      </div>
                      <div
                        class={css`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <LCDLabel>Sample Duration</LCDLabel>
                        <NumberInput
                          label="duration"
                          step={1}
                          min={1}
                          max={1024}
                          speed={0.1}
                          fineIsDefault
                          value={currentPattern()?.steps?.length}
                          onInput={handleUpdatePatternLength}
                        />
                      </div>
                      <div
                        class={css`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <LCDLabel>Current Time</LCDLabel>
                        <NumberInput
                          label="duration"
                          step={1}
                          min={1}
                          max={1024}
                          speed={0.1}
                          fineIsDefault
                          value={currentPattern()?.steps?.length}
                          onInput={handleUpdatePatternLength}
                        />
                      </div>
                      <div
                        class={css`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <LCDLabel>Playback Speed</LCDLabel>
                        <NumberInput
                          label="volume"
                          step={1}
                          min={1}
                          max={1024}
                          speed={0.1}
                          fineIsDefault
                          value={currentPattern()?.steps?.length}
                          onInput={handleUpdatePatternLength}
                        />
                      </div>
                      <div
                        class={css`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <LCDLabel>Volume</LCDLabel>
                        <NumberInput
                          label="volume"
                          step={1}
                          min={1}
                          max={1024}
                          speed={0.1}
                          fineIsDefault
                          value={currentPattern()?.steps?.length}
                          onInput={handleUpdatePatternLength}
                        />
                      </div>
                      <div
                        class={css`
                          display: flex;
                          justify-content: space-between;
                        `}
                      >
                        <div
                          class={css`
                            display: flex;
                            align-items: center;
                          `}
                        >
                          <LCDLabel>Start</LCDLabel>
                          <NumberInput
                            label="steps"
                            step={1}
                            min={1}
                            max={1024}
                            speed={0.1}
                            fineIsDefault
                            value={sliceState.start}
                            onChange={(start: number) => {
                              props.slice.set({
                                start: Math.min(
                                  sliceState.end + 0.00001,
                                  start
                                ),
                              });
                            }}
                          />
                        </div>
                        <div
                          class={css`
                            display: flex;
                            align-items: center;
                          `}
                        >
                          <LCDLabel minWidth="20px">End</LCDLabel>
                          <NumberInput
                            label="steps"
                            step={1}
                            min={1}
                            max={1024}
                            speed={0.1}
                            fineIsDefault
                            value={sliceState.end}
                            onChange={handleUpdateSampleEnd}
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      class={css`
                        display: flex;
                        justify-content: space-between;
                      `}
                    >
                      <MoogKnobWithLabel
                        min={0}
                        max={props.slice.sampler.buffer.duration}
                        speed={0.1}
                        step={0.01}
                        value={sliceState.start}
                        onChange={handleUpdateSampleStart}
                        label="Start"
                      />
                      <MoogKnobWithLabel
                        min={0}
                        max={3}
                        value={sliceState.playbackRate}
                        onChange={(playbackSpeed: number) => {
                          props.slice.set({ playbackRate: playbackSpeed });
                        }}
                        label="Pitch"
                      />
                      <MoogKnobWithLabel
                        min={0}
                        max={props.slice.sampler.buffer.duration}
                        speed={0.1}
                        step={0.01}
                        value={sliceState.end}
                        onChange={handleUpdateSampleEnd}
                        label="End"
                      />
                    </div>
                  </div>
                </div>
                <div
                  class={css`
                    display: flex;
                    flex-direction: column;
                    padding-left: 10px;
                    align-items: flex-start;
                  `}
                >
                  <div
                    class={css`
                      display: flex;
                      flex-direction: column;
                      align-items: flex-start;
                    `}
                  >
                    <ButtonWithLabel
                      label="Export"
                      onClick={() => {
                        exportBuffer(
                          props.slice.player.buffer,
                          `${encodeURI(
                            `${props.slice.sampler.title} (${props.slice.start}-${props.slice.end})`
                          )}.wav`
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
                      onClick={() => props.onRemoveSlice(props.slice)}
                      label="Delete"
                    />
                    <ButtonWithLabel
                      onClick={() => props.slice.duplicate()}
                      label="Clone"
                    />
                    <ShareSliceButton slice={props.slice} />

                    <div
                      class={css`
                        margin-top: 18px;
                        margin-bottom: 18px;
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
                          const bpm =
                            props.slice.sampler.engine.transport.bpm.value;
                          const barDuration = (60 / bpm) * 4;
                          const sliceDuration =
                            sliceState.end - sliceState.start;
                          const targetDuration =
                            Math.round(sliceDuration / barDuration) *
                            barDuration;

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
                  </div>
                  <div>
                    <MoogKnobWithLabel
                      min={0}
                      max={2}
                      value={sliceState.volume}
                      onChange={(volume: number) => {
                        props.slice.set({ volume });
                      }}
                      label="Volume"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <RackEar collapsed={sliceState.collapsed} />
        </div>
      </div>

      <DeviceWrapper
        background={sliceState.color}
        classList={{
          [css`
            height: 430px;
          `]: !sliceState.collapsed,
          [css`
            display: none;
          `]: !viewMode().sequencers,
        }}
      >
        <SlicePattern
          slice={props.slice}
          currentPatternIndex={props.currentPatternIndex}
        />
      </DeviceWrapper>

      <DeviceChainView
        deviceChain={props.slice.chain}
        classList={{
          [css`
            .device {
              height: 430px;
            }
          `]: true,
          [css`
            display: none !important;
          `]: sliceState.collapsed,
        }}
      ></DeviceChainView>
    </li>
  );
};
