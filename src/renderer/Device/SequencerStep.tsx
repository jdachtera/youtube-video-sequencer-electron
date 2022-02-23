import { Step } from 'renderer/engine/device/Slice';
import { NumberInputWithArrowButtons } from 'renderer/UI/NumberInputWithArrowButtons';
import { JSX, Match, mergeProps, splitProps, Switch } from 'solid-js';
import { css } from '../emotion-solid';

import { useAppTheme } from '../UI/theme';

export const sequencerModes: (keyof Step)[] = [
  'play',
  'playbackRate',
  'volume',
  'pitch',
];

export type SequencerMode = typeof sequencerModes[number];

type SequencerStepProps = {
  mode: SequencerMode;
  color?: string;
  isSelected?: boolean;
  isCurrent?: boolean;
  step?: Step;
  onChange?: (oldStep: Step, newStep: Step) => void;
} & Omit<JSX.IntrinsicElements['li'], 'onChange'>;

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
  `;
};

export const SequencerStep = (allProps: SequencerStepProps) => {
  const [ownProps, liProps] = splitProps(allProps, [
    'isSelected',
    'isCurrent',
    'step',
    'color',
    'onChange',
    'mode',
  ]);

  const props = mergeProps({ isSelected: false, isCurrent: false }, ownProps);

  return (
    <li
      {...liProps}
      classList={{
        [css`
          list-style: none;
          user-select: none;
          display: inline-flex;
          padding: 3px;
          cursor: pointer;
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
          background: ${props.color};
        `}
      >
        <Switch>
          <Match when={props.mode === 'play'}>
            <div
              onClick={() => {
                if (props.step) {
                  props.onChange?.(props.step, {
                    ...props.step,
                    play: !props.step.play,
                  });
                }
              }}
              classList={{
                [sequencerStepStyles()]: true,
                sequencerStepIsActive: props.step?.play,
                sequencerStepIsCurrent: props.isCurrent,
                sequencerStepIsSelected: props.isSelected,
                [css`
                  &:active {
                    border: none;
                  }
                `]: true,
              }}
            >
              &nbsp;
            </div>
          </Match>
          <Match
            when={
              (props.mode === 'playbackRate' ||
                props.mode === 'pitch' ||
                props.mode === 'volume') &&
              props.mode
            }
          >
            {(mode) => (
              <div
                classList={{
                  [sequencerStepStyles()]: true,
                  sequencerStepIsActive: props.step?.play,
                  sequencerStepIsCurrent: props.isCurrent,
                  sequencerStepIsSelected: props.isSelected,
                }}
              >
                <div
                  class={css`
                    zoom: 0.6;
                    input {
                      background: none;
                      border: none;
                      box-shadow: none;
                      text-align: center;
                      outline: none;
                      &:active {
                        outline: none;
                        border: none;
                        box-shadow: none;
                        border-radius: 0;
                      }
                    }
                    .buttons {
                      display: none;
                    }
                  `}
                >
                  <NumberInputWithArrowButtons
                    value={props.step?.[mode] ?? 1}
                    step={0.1}
                    size={2}
                    onChange={(value) => {
                      if (props.step) {
                        props.onChange?.(props.step, {
                          ...props.step,
                          [mode]: value,
                        });
                      }
                    }}
                  ></NumberInputWithArrowButtons>
                </div>
              </div>
            )}
          </Match>
        </Switch>
      </div>
    </li>
  );
};
