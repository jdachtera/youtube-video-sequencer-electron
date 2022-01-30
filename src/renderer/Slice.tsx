import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';

import { Step } from './SequencerStep';

import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import Sequencer from './Sequencer';
import { Action } from './SequencerAction';
import type SliceChain from './engine/SliceChain';

export type Slice = {
  id: string;
  url: string;
  start: number;
  end: number;
  playbackSpeed: number;
  reverse: boolean;
  color: string;
  patterns: Step[][];
};

const FormattedTime = ({ timeInSeconds }: { timeInSeconds: number }) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.round(timeInSeconds % 60);

  return (
    <>{`${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`}</>
  );
};

const VideoSlice = React.memo(
  ({
    chain,
    currentPatternIndex,
    onClickSlice,
    onUpdateSequenceLength,
    onRemoveSlice,
    onUpdateSteps,
    isSelected,
  }: {
    chain: SliceChain;
    currentPatternIndex: number;
    isSelected: boolean;
    onClickSlice: (slice: Slice) => void;
    onUpdateSequenceLength: (slice: Slice, sequenceLength: number) => void;
    onRemoveSlice: (slice: Slice) => void;
    onUpdateSteps: (slice: Slice, steps: Step[]) => void;
  }) => {
    console.log('Render VideoSlice');
    const [slice, setSlice] = useState(chain.getSlice());

    useEffect(
      () =>
        chain.subscribe('slice-updated', (updatedSlice) =>
          setSlice(updatedSlice)
        ),
      [chain, setSlice]
    );

    const handleClickSlice = useCallback(() => {
      onClickSlice(slice);
    }, [slice, onClickSlice]);

    const handleUpdateSequenceLength = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onUpdateSequenceLength(slice, event.target.valueAsNumber);
      },
      [slice, onUpdateSequenceLength]
    );

    const handleRemoveSlice = useCallback(() => {
      console.log('handleRemoveSlice', onRemoveSlice);
      onRemoveSlice(slice);
    }, [slice, onRemoveSlice]);

    const handleUpdateSteps = useCallback(
      (steps: Step[]) => {
        onUpdateSteps(slice, steps);
      },
      [slice, onUpdateSteps]
    );

    const onToggleStep = useCallback((step: Step): Action[] => {
      if (step.actions.length === 0) {
        return [{ type: 'PLAY' }];
      }
      return [];
    }, []);

    return (
      <li
        style={{ background: slice.color }}
        key={slice.id}
        className={`slice ${isSelected ? 'slice-active' : ''} `}
      >
        <div style={{ display: 'flex', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0px 0px 2px #222',
              borderBottomLeftRadius: '5px',
              borderTopLeftRadius: '5px',
            }}
          >
            <img
              alt="screw"
              src={ScrewHeadWithHole}
              width="35px"
              style={{ margin: '8px' }}
            />
            <img
              alt="screw"
              src={ScrewHeadWithHole}
              width="35px"
              style={{ margin: '8px' }}
            />
          </div>
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
            }}
          >
            <span className="lcd" style={{ margin: '8px', width: '300px' }}>
              {slice.id}
            </span>
            <FormattedTime timeInSeconds={slice.start} /> -{' '}
            <FormattedTime timeInSeconds={slice.end} />
            <input
              className="lcd"
              type="number"
              step="1"
              min="4"
              max="64"
              value={slice.patterns[currentPatternIndex].length}
              onChange={handleUpdateSequenceLength}
            />
            <button type="button" onClick={handleClickSlice}>
              Play
            </button>
            <button type="button" onClick={handleRemoveSlice}>
              Remove slice
            </button>
            <div style={{ marginLeft: 'auto' }}>
              <Sequencer
                steps={slice.patterns[currentPatternIndex]}
                chain={chain}
                onChange={handleUpdateSteps}
                onToggleStep={onToggleStep}
              />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRight: '1px inset #222',
              borderBottom: '1px solid #333',
              boxShadow: '0px 0px 2px #222',
            }}
          >
            <img
              alt="screw"
              src={ScrewHeadWithHole}
              width="35px"
              style={{ margin: '8px' }}
            />
            <img
              alt="screw"
              src={ScrewHeadWithHole}
              width="35px"
              style={{ margin: '8px' }}
            />
          </div>
        </div>
      </li>
    );
  }
);

export default VideoSlice;
