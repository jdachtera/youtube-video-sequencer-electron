import { createSignal, onMount, onCleanup } from 'solid-js';

import { css } from '@emotion/css';
import { Step } from './SequencerStep';

import RackEar from './RackEar';

import { Sequencer } from './Sequencer';
import { Action } from './SequencerAction';
import type { SliceChain } from './engine/SliceChain';

export type Slice = {
  id: string;
  start: number;
  end: number;
  volume?: number;
  playbackSpeed?: number;
  reverse?: boolean;
  color: string;
  patterns: Step[][];
};

const FormattedTime = (props: { timeInSeconds: number }) => {
  const minutes = Math.floor(props.timeInSeconds / 60);
  const seconds = Math.round(props.timeInSeconds % 60);

  return (
    <>{`${minutes.toString().padStart(2, '0')}:${seconds
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
  onUpdateSteps: (slice: Slice, steps: Step[]) => void;
}) => {
  const [slice, setSlice] = createSignal(props.chain.getSlice());

  const handleUpdateVolume = (event: { currentTarget: HTMLInputElement }) => {
    props.chain.setSlice({
      ...slice(),
      volume: event.currentTarget.valueAsNumber,
    });
  };

  const handleUpdatePlaybackSpeed = (event: {
    currentTarget: HTMLInputElement;
  }) => {
    props.chain.setSlice({
      ...slice(),
      playbackSpeed: event.currentTarget.valueAsNumber,
    });
  };

  const handleUpdateReverse = (event: { currentTarget: HTMLInputElement }) => {
    props.chain.setSlice({ ...slice(), reverse: event.currentTarget.checked });
  };

  const handleChainUpdated = () => {
    setSlice(props.chain.getSlice());
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
    props.onUpdateSteps(slice(), steps);
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

  return (
    <li
      style={{ background: slice().color }}
      className={css`
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
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
          }}
        >
          <span className="lcd" style={{ margin: '8px', width: '300px' }}>
            {slice().id}
          </span>
          <FormattedTime timeInSeconds={slice().start} /> -{' '}
          <FormattedTime timeInSeconds={slice().end} />
          <input
            className="lcd"
            type="number"
            step="1"
            min="4"
            max="64"
            value={slice().patterns[props.currentPatternIndex].length}
            onChange={handleUpdateSequenceLength}
          />
          <span className="lcd">{slice().volume}</span>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={slice().volume}
            onChange={handleUpdateVolume}
            style="-webkit-appearance: slider-vertical"
          />
          <span className="lcd">{slice().playbackSpeed}</span>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={slice().playbackSpeed}
            onChange={handleUpdatePlaybackSpeed}
            style="-webkit-appearance: slider-vertical"
          />
          Reverse:
          <input
            type="checkbox"
            checked={slice().reverse}
            onChange={handleUpdateReverse}
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
          <div style={{ marginLeft: 'auto' }}>
            <Sequencer
              steps={slice().patterns[props.currentPatternIndex]}
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
