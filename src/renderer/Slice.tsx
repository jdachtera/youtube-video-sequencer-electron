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

import RackEar from './RackEar';

import { Sequencer } from './Sequencer';
import { Action } from './SequencerAction';
import type { SliceChain } from './engine/SliceChain';

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
  onUpdateSequenceLength: (slice: Slice, sequenceLength: number) => void;
  onRemoveSlice: (slice: Slice) => void;
  onUpdatePattern: (slice: Slice, pattern: Pattern) => void;
}) => {
  const [slice, setSlice] = createSignal(untrack(() => props.chain.getSlice()));
  const currentPattern = createMemo(
    () => slice().patterns[props.currentPatternIndex]
  );

  const handleUpdatePlaybackSpeed = (event: {
    currentTarget: HTMLInputElement;
  }) => {
    props.chain.setSlice({
      ...slice(),
      playbackSpeed: event.currentTarget.valueAsNumber,
    });
  };

  const handleUpdateSampleStart = (event: {
    currentTarget: HTMLInputElement;
  }) => {
    props.chain.setSlice({
      ...slice(),
      start: event.currentTarget.valueAsNumber,
    });
  };

  const handleUpdateSampleEnd = (event: {
    currentTarget: HTMLInputElement;
  }) => {
    props.chain.setSlice({
      ...slice(),
      end: event.currentTarget.valueAsNumber,
    });
  };

  const handleUpdateReverse = (event: { currentTarget: HTMLInputElement }) => {
    props.chain.setSlice({ ...slice(), reverse: event.currentTarget.checked });
  };

  const handleUpdateSolo = (event: { currentTarget: HTMLInputElement }) => {
    props.chain.setSlice({ ...slice(), solo: event.currentTarget.checked });
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

  const handleUpdateSequenceLength = (event: {
    currentTarget: HTMLInputElement;
  }) => {
    props.onUpdateSequenceLength(slice(), event.currentTarget.valueAsNumber);
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
      style={{ background: slice().color }}
      class={css`
        box-shadow: inset 0 0 5px #000;
      `}
      classList={{
        slice: true,
        'slice-active': props.isSelected,
      }}
    >
      <div style={{ display: 'flex', width: '100%' }}>
        <RackEar />
        <div
          style={{
            width: '100%',
            //display: 'flex',
            alignItems: 'center',
            padding: '8px',
          }}
        >
          <input
            onChange={handleUpdateName}
            class="lcd"
            style={{ margin: '8px', width: '300px' }}
            value={slice().name}
          />
          <FormattedTime timeInSeconds={slice().start} /> -{' '}
          <FormattedTime timeInSeconds={slice().end} />
          <input
            class="lcd"
            type="number"
            step="1"
            min="1"
            max="1024"
            value={currentPattern()?.steps?.length}
            onChange={handleUpdateSequenceLength}
          />
          {/* <span class="lcd">{slice().volume}</span> */}
          Volume:
          <input
            type="number"
            min="0"
            max="2"
            step="0.01"
            value={slice().volume}
            onChange={(event) => {
              props.chain.setSlice({
                ...slice(),
                volume: event.currentTarget.valueAsNumber,
              });
            }}
            style="-webkit-appearance: slider-vertical"
            className="lcd"
          />
          {/* <span class="lcd">{slice().playbackSpeed}</span> */}
          Pitch:
          <input
            type="number"
            min="0"
            max="3"
            step="0.01"
            value={slice().playbackSpeed}
            onChange={handleUpdatePlaybackSpeed}
            className="lcd"
            //style="-webkit-appearance: slider-vertical"
          />
          Start:
          <input
            type="number"
            //min="0"
            //max="3"
            step="0.001"
            value={slice().start}
            onChange={handleUpdateSampleStart}
            className="lcd"
            style="width: 200px"
            //style="-webkit-appearance: slider-vertical"
          />
          End:
          <input
            type="number"
            //min="0"
            //max="3"
            step="0.001"
            value={slice().end}
            onChange={handleUpdateSampleEnd}
            className="lcd"
            style="width: 200px"
            //style="-webkit-appearance: slider-vertical"
          />
          Reverse:
          <input
            type="checkbox"
            checked={slice().reverse}
            onChange={handleUpdateReverse}
          />
          Solo:
          <input
            type="checkbox"
            checked={slice().solo}
            onChange={handleUpdateSolo}
          />
          <button type="button" onClick={handleClickSlice}>
            Play
          </button>
          <button type="button" onClick={handleRemoveSlice}>
            Remove slice
          </button>
          <button type="button" onClick={handleCloneSlice}>
            Clone slice
          </button>
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
          <div style={{ marginLeft: 'auto' }}>
            <Sequencer
              steps={slice().patterns[props.currentPatternIndex].steps}
              chain={props.chain}
              onChange={handleUpdateSteps}
              onToggleStep={onToggleStep}
            />
          </div>
        </div>
        <RackEar />
      </div>
    </li>
  );
};
