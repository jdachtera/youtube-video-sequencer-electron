import React, { ChangeEvent, useCallback } from 'react';

import { Step } from './SequencerStep';

import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import Sequencer from './Sequencer';
import { Action } from './SequencerAction';

export type Slice = {
  id: string;
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
    slice,
    currentPatternIndex,
    currentStep,
    onClickSlice,
    onUpdateSequenceLength,
    onRemoveSlice,
    onUpdateSteps,
    isSelected,
  }: {
    slice: Slice;
    currentPatternIndex: number;
    currentStep: Step;
    isSelected: boolean;
    onClickSlice: (slice: Slice) => void;
    onUpdateSequenceLength: (slice: Slice, sequenceLength: number) => void;
    onRemoveSlice: (slice: Slice) => void;
    onUpdateSteps: (slice: Slice, steps: Step[]) => void;
  }) => {
    const handleClickSlice = useCallback(() => {
      onClickSlice(slice);
    }, [slice]);

    const handleUpdateSequenceLength = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onUpdateSequenceLength(slice, event.target.valueAsNumber);
      },
      [slice]
    );

    const handleRemoveSlice = useCallback(() => {
      onRemoveSlice(slice);
    }, [slice]);

    const handleUpdateSteps = useCallback(
      (steps: Step[]) => {
        onUpdateSteps(slice, steps);
      },
      [slice]
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
        onClick={handleClickSlice}
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
              src={ScrewHeadWithHole}
              width="35px"
              style={{ margin: '8px' }}
            />
            <img
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
            <button type="button" onClick={handleRemoveSlice}>
              Remove slice
            </button>
            <div style={{ marginLeft: 'auto' }}>
              <Sequencer
                steps={slice.patterns[currentPatternIndex]}
                currentStep={currentStep}
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
              src={ScrewHeadWithHole}
              width="35px"
              style={{ margin: '8px' }}
            />
            <img
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
