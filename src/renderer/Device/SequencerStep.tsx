import { JSX, splitProps } from 'solid-js';
import { Step } from 'renderer/engine/device/Slice';
import { css } from 'solid-styled-components';

import { useAppTheme } from '../theme';

type SequencerStepProps = {
  step: Step;
  isSelected: boolean;
  isCurrent: boolean;
  onClick?: (step: Step) => void;
  onDblClick?: (step: Step) => void;
} & Omit<JSX.IntrinsicElements['li'], 'onClick' | 'onDblClick'>;

const sequencerStepStyles = () => {
  const theme = useAppTheme();
  return css`
    display: inline-block;
    user-select: none;
    width: 20px;
    height: 20px;
    margin: 2px;
    border-radius: 4px;
    border: 3px outset #eee;
    background: rgb(198, 198, 198);
    background: linear-gradient(
      138deg,
      rgb(219, 204, 174) 10%,
      rgb(255, 255, 255) 100%
    );

    &:active {
      border: 3px inset white;
    }

    &:nth-of-type(8n + 5),
    &:nth-of-type(8n + 6),
    &:nth-of-type(8n + 7),
    &:nth-of-type(8n + 8) {
      background: linear-gradient(
        138deg,
        rgb(182, 176, 164) 10%,
        rgba(255, 255, 255, 1) 100%
      );
    }

    &.sequencerStepIsCurrent {
      box-shadow: 0px 0px 4px white;
      border: 3px outset #ffffff !important;
      background: rgb(254, 243, 241) !important;
      background: radial-gradient(
        circle,
        rgb(255, 255, 255) 0%,
        #e2e2e2 80%
      ) !important;
    }

    &.sequencerStepIsSelected {
      box-shadow: 0px 0px 6px white;
      border: 3px outset white;
      background-color: ${theme.colors.primary};
    }

    &.sequencerStepIsActive {
      box-shadow: 0px 0px 6px #ee8624;
      border: 3px outset #ee5724;
      background: rgb(254, 243, 241);
      background: radial-gradient(
        circle,
        rgb(255, 184, 143) 10%,
        rgb(255, 122, 78) 80%
      );
      &:nth-of-type(8n + 5),
      &:nth-of-type(8n + 6),
      &:nth-of-type(8n + 7),
      &:nth-of-type(8n + 8) {
        border: 3px outset #52c723;

        background: radial-gradient(
          circle,
          rgb(229, 255, 143) 10%,
          rgb(24, 255, 36) 80%
        );
      }
    }

    &.sequencerStepIsHalfActive {
      box-shadow: 0px 0px 3px white;
      border: 3px outset #ff6f41;
      background: rgb(254, 243, 241);
      background: radial-gradient(
        circle,
        rgb(255, 238, 0) 0%,
        rgb(255, 65, 2) 100%
      );
    }
  `;
};

export const SequencerStep = (allProps: SequencerStepProps) => {
  const [props, liProps] = splitProps(allProps, [
    'step',
    'isSelected',
    'isCurrent',
    'onClick',
    'onDblClick',
  ]);
  return (
    <li
      {...liProps}
      classList={{
        [css`
          list-style: none;
          user-select: none;
          display: inline-flex;
          padding: 3px;
        `]: true,
        ...liProps.classList,
      }}
    >
      <div
        class={css`
          padding: 1px;
          border: 3px inset #ffffff9d;
          border-radius: 7px;
          background: #555;
          box-shadow: inset 0 0 2px 2px #222;
          display: inline-flex;
        `}
      >
        <div
          classList={{
            [sequencerStepStyles()]: true,
            sequencerStepIsActive: !!props.step.actions.find(
              ({ type }) => type === 'PLAY'
            ),
            sequencerStepIsHalfActive:
              !!props.step.actions.length &&
              !props.step.actions.find(({ type }) => type === 'PLAY'),
            sequencerStepIsCurrent: props.isCurrent,
            sequencerStepIsSelected: props.isSelected,
          }}
          onClick={() => props?.onClick?.(props.step)}
          onDblClick={() => props?.onDblClick?.(props.step)}
        >
          &nbsp;
        </div>
      </div>
    </li>
  );
};
