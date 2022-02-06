import {
  createSignal,
  onMount,
  onCleanup,
  createMemo,
  untrack,
  For,
} from 'solid-js';

import { css } from 'solid-styled-components';
import { Step } from './SequencerStep';

import RackEar, { RackEar2 } from './RackEar';
import { LCDLabel, PowerSwitch } from './UI';
import screwHead from './svg/screw_head.svg'

import { WavesurferSliceView } from './WavesurferSliceView';

import { Sequencer } from './Sequencer';
import { Action } from './SequencerAction';
import type { SliceChain } from './engine/SliceChain';
import { MoogKnobWithLabel, NumberInput, NumberInputWithLabel } from './Knob';
import { useAppTheme } from './theme';
import { Toggle } from './Toggle';
import { read } from 'fs';

export type Pattern = {
  subdivision: number;
  subdivisionType: typeof subdivisionTypes[number];
  steps: Step[];
};

export type Slice = {
  id: string;
  start: number;
  end: number;
  volume: number;
  playbackSpeed: number;
  reverse: boolean;
  color: string;
  patterns: Pattern[];
  name: string;
  solo: boolean;
};

const subdivisions = [
  -0.5,
  ...Array.from({ length: 7 }).map((_, index) => Math.pow(2, index)),
];

const subdivisionTypes = ['n', 't', 'n.'] as const;

const FormattedTime = (props: { timeInSeconds: number }) => {
  const minutes = createMemo(() => Math.floor(props.timeInSeconds / 60));
  const seconds = createMemo(() => Math.round(props.timeInSeconds % 60));

  return (
    <>{`${minutes().toString().padStart(2, '0')}:${seconds()
      .toString()
      .padStart(2, '0')}`}</>
  );
};

export const VideoSlice = (props: {
  chain: SliceChain;
  currentPatternIndex: number;
  isSelected: boolean;
  onClickSlice: (slice: Slice) => void;
  onUpdatePatternLength: (slice: Slice, sequenceLength: number) => void;
  onRemoveSlice: (slice: Slice) => void;
  onUpdatePattern: (slice: Slice, pattern: Pattern) => void;
}) => {
  const [slice, setSlice] = createSignal(untrack(() => props.chain.getSlice()));
  const currentPattern = createMemo(
    () => slice().patterns[props.currentPatternIndex]
  );

  const handleUpdatePlaybackSpeed = (playbackSpeed: number) => {
    props.chain.setSlice({
      ...slice(),
      playbackSpeed,
    });
  };

  const handleUpdateSampleStart = (start: number) => {
    props.chain.setSlice({
      ...slice(),
      start: Math.min(slice().end + 0.00001, start),
    });
  };

  const handleUpdateSampleEnd = (end: number) => {
    props.chain.setSlice({
      ...slice(),
      end: Math.max(slice().start + 0.00001, end),
    });
  };

  const handleUpdateReverse = (reverse: boolean) => {
    props.chain.setSlice({ ...slice(), reverse });
  };

  const handleUpdateSolo = (solo: boolean, altKey: boolean) => {
    if (solo && !altKey) {
      props.chain
        .getSampler()
        .getEngine()
        .getSamplers()
        .forEach((sampler) => {
          sampler.chains.forEach((chain) => {
            chain.setSlice({
              ...chain.getSlice(),
              solo: slice() === chain.getSlice(),
            });
          });
        });
    } else {
      props.chain.setSlice({ ...slice(), solo });
    }
  };

  const handleChainUpdated = () => {
    setSlice(props.chain.getSlice());
  };

  const handleUpdateName = (event: { currentTarget: HTMLInputElement }) => {
    props.chain.setSlice({ ...slice(), name: event.currentTarget.value });
  };

  onMount(() => props.chain.on('chain-updated', handleChainUpdated));
  onCleanup(() => props.chain.off('chain-updated', handleChainUpdated));

  const handleClickSlice = () => {
    props.onClickSlice(slice());
  };

  const handleUpdatePatternLength = (patternLength: number) => {
    props.onUpdatePatternLength(slice(), patternLength);
  };

  const handleRemoveSlice = () => {
    props.onRemoveSlice(slice());
  };

  const handleUpdateSteps = (steps: Step[]) => {
    props.onUpdatePattern(slice(), { ...currentPattern(), steps });
  };

  const handleCloneSlice = () => {
    const sliceData = slice();
    props.chain.getSampler().createChain({
      ...sliceData,
      id: `${sliceData.id}_clone`,
    });
  };

  const onToggleStep = (step: Step): Action[] => {
    if (step.actions.length === 0) {
      return [{ type: 'PLAY' }];
    }
    return [];
  };

  const handleUpdateSubdivision = (event: {
    currentTarget: HTMLSelectElement;
  }) => {
    props.onUpdatePattern(slice(), {
      ...currentPattern(),
      subdivision: +event.currentTarget.value,
    });
  };

  const handleUpdateSubdivisionType = (event: {
    currentTarget: HTMLSelectElement;
  }) => {
    props.onUpdatePattern(slice(), {
      ...currentPattern(),
      subdivisionType: event.currentTarget.value as Pattern['subdivisionType'],
    });
  };

  return (
    <li
      // style={{ background: slice().color }}
      class={css`
        display: flex;
        align-items: center;
        padding: 0;
        margin: 0;
        box-shadow: 0px 0px 2px inset #222;
        border-radius: 4px;
        margin-bottom: 2px;
        background-color: ${slice().color};
      `}
      classList={{
        'slice-active': props.isSelected,
      }}
    >
      <div style={{ display: 'flex', width: '100%' }}>
        <RackEar />
        <div>
          <Toggle
            label="Mains"
            checked={slice().solo}
            onChange={handleUpdateSolo}
          />
          <div
            class={css`
              width: 100%;
              display: flex;
              align-items: center;
              vertical-align: top;
              padding: 8px;
            `}
          >
            <div class={css`
              display: flex;
              flex-direction: column;
              padding: 2px;
            `}>
            <div class={css`
              display: flex;
            `}>
          <RackEar2/>
          <div class={css`
              display: inline-flex;
              flex-direction: column;
              background: #949494;
              color: rgb(63, 63, 63);
              font-size: 20px;
              border: 2px inset #ffffffac;
              box-shadow: inset 2px 2px 5px 1px #000000c1;
              border-radius: 4px;
              text-shadow: 1px 1px 1px rgba(119, 119, 119, 0.849);
              padding: 8px;
          `}>
            <LCDLabel>Sample</LCDLabel>
            <WavesurferSliceView
              chain={props.chain}
              center={1}
            />
            <div class={css`
            display: flex;
            align-items: center;
            `}>
              <LCDLabel>Name</LCDLabel>
              <input
                onChange={handleUpdateName}
                class={css`
                  background: none;
                  border: none;
                  font-family: '7seg';
                  color: #444;
                  `}
                value={slice().name}
                />
              </div>
              <div class={css`
                display: flex;
                align-items: center;
              `}>
              <LCDLabel>Steps</LCDLabel>
              <NumberInput
                label='steps'
                step={1}
                min={1}
                max={1024}
                speed={0.1}
                fineIsDefault
                value={currentPattern()?.steps?.length}
                onInput={handleUpdatePatternLength}
              />
              </div>
              <div class={css`
                display: flex;
                justify-content: space-between;
              `}>

              <div class={css`
                display: flex;
                align-items: center;
              `}>
              <LCDLabel>Start</LCDLabel>
              <NumberInput
                label='steps'
                step={1}
                min={1}
                max={1024}
                speed={0.1}
                fineIsDefault
                value={slice().start}
                onChange={handleUpdateSampleStart}
              />
              </div>
                <div class={css`
                  display: flex;
                  align-items: center;
                `}>
                <LCDLabel>End</LCDLabel>
                <NumberInput
                  label='steps'
                  step={1}
                  min={1}
                  max={1024}
                  speed={0.1}
                  fineIsDefault
                  value={slice().end}
                  onChange={handleUpdateSampleEnd}
                />
                </div>
              </div>

          </div>
            <RackEar2/>
            </div>
            <button type="button" onMouseDown={handleClickSlice} class={css`
            border: 2px outset white;
            padding: 10px;
            border-radius: 2px;
            box-shadow: 0 0 1px 2px #333;
            background: radial-gradient(#c2c2c2, #fff);
            font-family: 'oswald';
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
            width: 50px;
            &:active {
              border: 2px inset white;
            }
          `}>
            PLAY
          </button>
          </div>

          <FormattedTime timeInSeconds={slice().start} /> -{' '}
          <FormattedTime timeInSeconds={slice().end} />
          <div>{props.chain.getPlayer().now()}</div>
          <MoogKnobWithLabel
            label="Steps"
            step={1}
            min={1}
            max={1024}
            speed={0.1}
            fineIsDefault
            value={currentPattern()?.steps?.length}
            onChange={handleUpdatePatternLength}
          />
          <MoogKnobWithLabel
            min={0}
            max={2}
            value={slice().volume}
            onChange={(volume: number) => {
              props.chain.setSlice({
                ...slice(),
                volume,
              });
            }}
            label="Volume"
          />
          <MoogKnobWithLabel
            min={0}
            max={3}
            value={slice().playbackSpeed}
            onChange={handleUpdatePlaybackSpeed}
            label="Pitch"
          />
          <MoogKnobWithLabel
            min={0}
            max={props.chain.getSampler().buffer.duration}
            speed={0.1}
            step={0.01}
            value={slice().start}
            onChange={handleUpdateSampleStart}
            label="Start"
          />
          <MoogKnobWithLabel
            min={0}
            max={props.chain.getSampler().buffer.duration}
            speed={0.1}
            step={0.01}
            value={slice().end}
            onChange={handleUpdateSampleEnd}
            label="End"
          />
          <Toggle
            label="Reverse"
            checked={slice().reverse}
            onChange={handleUpdateReverse}
          />
          <Toggle
            label="Solo"
            checked={slice().solo}
            onChange={handleUpdateSolo}
          />

          <button type="button" onClick={handleRemoveSlice}>
            Remove slice
          </button>
          <button type="button" onClick={handleCloneSlice}>
            Clone slice
          </button>
          </div>
          <div>
          <select
            value={currentPattern()?.subdivision ?? 16}
            onChange={handleUpdateSubdivision}
          >
            <For each={subdivisions}>
              {(subdivision) => (
                <option value={subdivision}>{subdivision}</option>
              )}
            </For>
          </select>
          <select
            value={currentPattern()?.subdivisionType ?? 'n'}
            onChange={handleUpdateSubdivisionType}
          >
            <For each={subdivisionTypes}>
              {(subdivisionType) => (
                <option value={subdivisionType}>{subdivisionType}</option>
              )}
            </For>
          </select>
          <div class={css`
          `}>
            <Sequencer
              steps={slice().patterns[props.currentPatternIndex].steps}
              chain={props.chain}
              onChange={handleUpdateSteps}
              onToggleStep={onToggleStep}
            />
          </div>
        </div>
        </div>
        <RackEar />
      </div>
    </li>
  );
};
