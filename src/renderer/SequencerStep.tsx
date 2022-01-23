import React, { useCallback } from 'react';
import { Action } from './SequencerAction';

export type Step = {
  actions: Action[];
};

const SequencerStep: React.FC<{
  step: Step;
  isSelected: boolean;
  isCurrent: boolean;
  onClick?: (step: Step) => void;
  onDoubleClick?: (step: Step) => void;
  onAuxClick?: (step: Step) => void;
}> = ({
  step,
  isSelected,
  isCurrent,
  onClick = () => {},
  onDoubleClick = () => {},
  onAuxClick = () => {},
}) => {
  const handleClick = useCallback(() => {
    onClick(step);
  }, [step, onClick]);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(step);
  }, [step, onDoubleClick]);

  const handleAuxClick = useCallback(() => {
    onAuxClick(step);
  }, [step, onAuxClick]);

  return (
    <li
      className={`sequencer-step ${
        isSelected ? 'sequencer-step-selected' : ''
      } ${isCurrent ? 'sequencer-step-current' : ''}
      sequencer-step-${
        // eslint-disable-next-line no-nested-ternary
        step.actions.length
          ? step.actions.find(({ type }) => type === 'PLAY')
            ? 'play'
            : 'active'
          : 'inactive'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onAuxClick={handleAuxClick}
    >
      &nbsp;
    </li>
  );
};

export default SequencerStep;
