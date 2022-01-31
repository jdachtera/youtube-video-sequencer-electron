import { cx, css } from '@emotion/css';

import { Action } from './SequencerAction';

export type Step = {
  actions: Action[];
};

type SequencerStepProps = {
  step: Step;
  isSelected: boolean;
  isCurrent: boolean;
  onClick?: (step: Step) => void;
  onDoubleClick?: (step: Step) => void;
};

export const SequencerStep = (props: SequencerStepProps) => {
  const handleClick = () => {
    props?.onClick?.(props.step);
  };

  const handleDoubleClick = () => {
    props?.onDoubleClick?.(props.step);
  };

  return (
    <li
      className={sequencerStepStyles(props)}
      onClick={handleClick}
      onDblClick={handleDoubleClick}
    >
      &nbsp;
    </li>
  );
};

const sequencerStepStyles = (props: SequencerStepProps) =>
  cx(
    css`
      display: inline-block;
      user-select: none;
      width: 30px;
      height: 30px;
      margin: 2px;
      border-radius: 4px;
      border: 3px outset #eee;
      background: rgb(198, 198, 198);
      background: linear-gradient(
        138deg,
        rgb(219, 204, 174) 10%,
        rgba(255, 255, 255, 1) 100%
      );
    `,
    // eslint-disable-next-line no-nested-ternary
    props.step.actions.length
      ? props.step.actions.find(({ type }) => type === 'PLAY')
        ? css`
            box-shadow: 0px 0px 6px #ee8624;
            border: 3px outset #ee5724;
            background: rgb(254, 243, 241);
            background: radial-gradient(
              circle,
              rgb(255, 184, 143) 10%,
              rgb(255, 122, 78) 80%
            );
          `
        : css`
            box-shadow: 0px 0px 3px white;
            border: 3px outset #ff6f41;
            background: rgb(254, 243, 241);
            background: radial-gradient(
              circle,
              rgb(255, 238, 0) 0%,
              rgb(255, 65, 2) 100%
            );
          `
      : null,
    props.isCurrent
      ? css`
          box-shadow: 0px 0px 4px white;
          border: 3px outset #ffffff !important;
          background: rgb(254, 243, 241) !important;
          background: radial-gradient(
            circle,
            rgb(255, 255, 255) 0%,
            #e2e2e2 80%
          ) !important;
        `
      : null,
    props.isSelected
      ? css`
          box-shadow: 0px 0px 6px white;
          border: 3px outset white;
        `
      : null
  );
