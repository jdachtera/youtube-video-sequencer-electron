import { createSignal, onMount, onCleanup } from 'solid-js';

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

  const onToggleStep = (step: Step): Action[] => {
    if (step.actions.length === 0) {
      return [{ type: 'PLAY' }];
    }
    return [];
  };

  return (
    <li
      style={{ background: slice().color }}
      classList={{
        slice: true,
        'slice-active': props.isSelected,
      }}
    >
      <div style={{ display: 'flex', width: '100%' }}>
        <RackEar/>
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
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={slice().volume}
            onChange={handleUpdateVolume}
          />
          <button type="button" onClick={handleClickSlice}>
            Play
          </button>
          <button type="button" onClick={handleRemoveSlice}>
            Remove slice
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
        <RackEar/>
      </div>
    </li>
  );
};
