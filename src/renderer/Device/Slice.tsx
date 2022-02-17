import { createMemo, untrack } from 'solid-js';

import { css } from 'solid-styled-components';

import { LCDLabel, LCD, ModuleFrame, ButtonWithLabel, RackEar } from '../UI';

import { WavesurferSliceView } from './WavesurferSliceView';

import type { Slice } from '../engine/device/Slice';
import { MoogKnobWithLabel, NumberInput } from '../controls/Knob';

import { Toggle } from '../controls/Toggle';
import { ShareSliceButton } from '../ShareSliceButton';
import { createStoreFromEventEmitter } from '../createSignalFromEventEmitter';
import { SlicePattern } from '../PatternEditor';
import { DeviceChainView } from './DeviceChainView';

const FormattedTime = (props: { timeInSeconds: number }) => {
  const minutes = createMemo(() => Math.floor(props.timeInSeconds / 60));
  const seconds = createMemo(() => Math.round(props.timeInSeconds % 60));

  return (
    <>{`${minutes().toString().padStart(2, '0')}:${seconds()
      .toString()
      .padStart(2, '0')}`}</>
  );
};

export const SampleSlice = (props: {
  slice: Slice;
  currentPatternIndex: number;
  isSelected: boolean;
  onClickSlice: (slice: Slice) => void;
  onRemoveSlice: (slice: Slice) => void;
}) => {
  const slice = createStoreFromEventEmitter(
    untrack(() => props.slice),
    'change',
    (slice) => slice.serialize()
  );

  const currentPattern = createMemo(
    () => slice.patterns[props.currentPatternIndex]
  );

  const handleUpdateSampleStart = (start: number) => {
    props.slice.update({
      start: Math.min(slice.end + 0.00001, start),
    });
  };

  const handleUpdateSampleEnd = (end: number) => {
    props.slice.update({
      end: Math.max(slice.start + 0.00001, end),
    });
  };

  const handleUpdatePatternLength = (patternLength: number) => {
    props.slice.updatePatternLength(props.currentPatternIndex, patternLength);
  };

  const handleUpdateSolo = (solo: boolean, altKey: boolean) => {
    props.slice.setSolo(solo, altKey);
  };

  const toggleCollapse = () => {
    props.slice.update({
      collapsed: slice.collapsed ? false : true,
    });
  };

  return (
    <li
      // style={{ background: slice.color }}
      class={css`
        display: flex;
        align-items: center;
        padding: 0;
        margin: 0;
        box-shadow: 0px 0px 2px inset #222;
        border-radius: 4px;
        margin-bottom: 2px;
        background-color: ${slice.color};
        transition: all 2s ease;
      `}
      classList={{
        'slice-active': props.isSelected,
      }}
    >
      <div
        class={css`
          display: flex;
          width: 100%;
        `}
      >
        <RackEar onClick={toggleCollapse} collapsed={slice.collapsed} />

        <div
          class={css`
            display: flex;
            flex-direction: column;
            width: 100%;
            padding: 20px;
          `}
        >
          <div
            class={css`
              display: flex;
              align-items: center;
              display: ${slice.collapsed ? 'flex' : 'none'};
            `}
          >
            <LCD>
              <WavesurferSliceView slice={props.slice} center={1} height={30} />
            </LCD>
          </div>

          <div
            class={css`
              display: flex;
              align-items: center;
              display: ${slice.collapsed ? 'none' : 'flex'};
            `}
          >
            <div
              class={css`
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                padding-right: 50px;
              `}
            >
              {/* <ModuleFrame> */}
              <Toggle
                label="Mains"
                checked={slice.solo}
                onChange={handleUpdateSolo}
              />
              {/* </ModuleFrame> */}
            </div>
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
                  <ModuleFrame>
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
                      <WavesurferSliceView slice={props.slice} center={1} />
                      <div
                        class={css`
                          display: flex;
                          align-items: center;
                        `}
                      >
                        <LCDLabel>Name</LCDLabel>
                        <input
                          onChange={(event) => {
                            props.slice.update({
                              name: event.currentTarget.value,
                            });
                          }}
                          class={css`
                            background: none;
                            border: none;
                            font-family: '7seg';
                            color: #444;
                          `}
                          value={slice.name}
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
                            value={slice.start}
                            onChange={(start: number) => {
                              props.slice.update({
                                start: Math.min(slice.end + 0.00001, start),
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
                            value={slice.end}
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
                        value={slice.start}
                        onChange={handleUpdateSampleStart}
                        label="Start"
                      />
                      <MoogKnobWithLabel
                        min={0}
                        max={props.slice.sampler.buffer.duration}
                        speed={0.1}
                        step={0.01}
                        value={slice.end}
                        onChange={handleUpdateSampleEnd}
                        label="End"
                      />
                    </div>
                  </ModuleFrame>
                </div>
              </div>
              <div
                class={css`
                  display: flex;
                  flex-direction: column;
                  padding-left: 60px;
                  align-items: flex-start;
                `}
              >
                <ModuleFrame>
                  <div
                    class={css`
                      display: flex;
                      flex-direction: column;
                      align-items: flex-start;
                    `}
                  >
                    <ButtonWithLabel
                      onClick={() => props.onClickSlice(props.slice)}
                      label="Audition Sample"
                    />
                    <ButtonWithLabel
                      onClick={() => {
                        props.slice.update({
                          reverse: slice.reverse ? false : true,
                        });
                      }}
                      label="Reverse"
                    />
                    <div>asdf{slice.collapsed}</div>
                    <ButtonWithLabel
                      onClick={() => props.onRemoveSlice(props.slice)}
                      label="Delete"
                    />
                    <ButtonWithLabel
                      onClick={() => props.slice.duplicate()}
                      label="Clone"
                    />
                    <ButtonWithLabel
                      onClick={() => {
                        props.slice.update({
                          playbackSpeed: slice.playbackSpeed / 2,
                        });
                      }}
                      label="/2"
                    />
                    <ButtonWithLabel
                      onClick={() => {
                        const bpm =
                          props.slice.sampler.engine.transport.bpm.value;
                        const barDuration = (60 / bpm) * 4;
                        const sliceDuration = slice.end - slice.start;
                        const targetDuration =
                          Math.round(sliceDuration / barDuration) * barDuration;

                        const playbackSpeed = sliceDuration / targetDuration;

                        props.slice.update({ playbackSpeed });
                      }}
                      label="Align to tempo"
                    />
                    <ButtonWithLabel
                      onClick={() => {
                        props.slice.update({
                          playbackSpeed: slice.playbackSpeed * 2,
                        });
                      }}
                      label="x2"
                    />
                    <ShareSliceButton slice={props.slice} />
                  </div>
                </ModuleFrame>
              </div>
            </div>
            <ModuleFrame>
              <div>
                <FormattedTime timeInSeconds={slice.start} /> -{' '}
                <FormattedTime timeInSeconds={slice.end} />
                <div>{props.slice.player.now()}</div>
                <MoogKnobWithLabel
                  min={0}
                  max={2}
                  value={slice.volume}
                  onChange={(volume: number) => {
                    props.slice.update({ volume });
                  }}
                  label="Volume"
                />
                <MoogKnobWithLabel
                  min={0}
                  max={3}
                  value={slice.playbackSpeed}
                  onChange={(playbackSpeed: number) => {
                    props.slice.update({ playbackSpeed });
                  }}
                  label="Pitch"
                />
                <Toggle
                  label="Reverse"
                  checked={slice.reverse}
                  onChange={(reverse) => {
                    props.slice.update({ reverse: !reverse });
                  }}
                />
                <Toggle
                  label="Solo"
                  checked={slice.solo}
                  onChange={handleUpdateSolo}
                />
              </div>
            </ModuleFrame>
          </div>
        </div>
        <RackEar collapsed={slice.collapsed} />

        <SlicePattern
          classList={{
            [css`
              display: none;
            `]: slice.collapsed,
          }}
          slice={props.slice}
          currentPatternIndex={props.currentPatternIndex}
        />

        <DeviceChainView deviceChain={props.slice.chain}></DeviceChainView>
      </div>
    </li>
  );
};
