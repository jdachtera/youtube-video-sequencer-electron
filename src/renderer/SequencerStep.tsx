import { Action } from './SequencerAction';

export type Step = {
  actions: Action[];
};

export const SequencerStep = (props: {
  step: Step;
  isSelected: boolean;
  isCurrent: boolean;
  onClick?: (step: Step) => void;
  onDoubleClick?: (step: Step) => void;
}) => {
  const handleClick = () => {
    props?.onClick?.(props.step);
  };

  const handleDoubleClick = () => {
    props?.onDoubleClick?.(props.step);
  };

  return (
    <li
      className={`
      sequencer-step-${
        // eslint-disable-next-line no-nested-ternary
        props.step.actions.length
          ? props.step.actions.find(({ type }) => type === 'PLAY')
            ? 'play'
            : 'active'
          : 'inactive'
      }
      sequencer-step ${props.isCurrent ? 'sequencer-step-current' : ''} ${
        props.isSelected ? 'sequencer-step-selected' : ''
      }
      `}
      onClick={handleClick}
      onDblClick={handleDoubleClick}
    >
      &nbsp;
    </li>
  );
};
