import { css } from 'solid-styled-components';
import { Action } from './SequencerAction';
import { useAppTheme } from './theme';

export type Step = {
  actions: Action[];
};

type SequencerStepProps = {
  step: Step;
  isSelected: boolean;
  isCurrent: boolean;
  onClick?: (step: Step) => void;
  onDblClick?: (step: Step) => void;
};

const sequencerStepBaseStyles = css`
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
  &:active { border: 3px inset white; };
  &:nth-of-type(8n+5),
  &:nth-of-type(8n+6),
  &:nth-of-type(8n+7),
  &:nth-of-type(8n+8)

  //&:nth-of-type(10n+6),
  //&:nth-of-type(10n+7),
  //&:nth-of-type(10n+8)
  {
    /* background: red !important; */
    background: linear-gradient(
      138deg,
      rgb(182, 176, 164) 10%,
      rgba(255, 255, 255, 1) 100%
    );
  }
`;

const sequencerStepActiveStyles = css`
  box-shadow: 0px 0px 6px #ee8624;
  border: 3px outset #ee5724;
  background: rgb(254, 243, 241);
  background: radial-gradient(
    circle,
    rgb(255, 184, 143) 10%,
    rgb(255, 122, 78) 80%
  );
  &:nth-of-type(8n+5),
  &:nth-of-type(8n+6),
  &:nth-of-type(8n+7),
  &:nth-of-type(8n+8)

  //&:nth-of-type(10n+6),
  //&:nth-of-type(10n+7),
  //&:nth-of-type(10n+8)
  {
    /* background: red !important; */
    border: 3px outset #52c723;

    background: radial-gradient(
      circle,
      rgb(229, 255, 143) 10%,
      rgb(24, 255, 36) 80%
    );
  }
`;

const sequencerStepHalfActiveStyles = css`
  box-shadow: 0px 0px 3px white;
  border: 3px outset #ff6f41;
  background: rgb(254, 243, 241);
  background: radial-gradient(
    circle,
    rgb(255, 238, 0) 0%,
    rgb(255, 65, 2) 100%
  );
`;

const sequencerStepIsCurrentStyles = css`
  box-shadow: 0px 0px 4px white;
  border: 3px outset #ffffff !important;
  background: rgb(254, 243, 241) !important;
  background: radial-gradient(
    circle,
    rgb(255, 255, 255) 0%,
    #e2e2e2 80%
  ) !important;
`;

const sequencerStepIsSelectedStyles = () => {
  const theme = useAppTheme();

  return css`
    box-shadow: 0px 0px 6px white;
    border: 3px outset white;
    background-color: ${theme.colors.primary};
  `;
};

export const SequencerStep = (props: SequencerStepProps) => (
  <li class={css`
    list-style: none;
    user-select: none;
    display: inline-flex;
    padding: 3px;
  `}>
    <div class={css`
      padding: 1px;
      border: 3px inset #ffffffd6;
      border-radius: 7px;
      background: #555;
      box-shadow: inset 0 0 2px 2px #222;
      display: inline-flex;
    `}>

    <div
    classList={{
      [sequencerStepBaseStyles]: true,
      [sequencerStepActiveStyles]: !!props.step.actions.find(
        ({ type }) => type === 'PLAY'
      ),
      [sequencerStepHalfActiveStyles]:
        !!props.step.actions.length &&
        !props.step.actions.find(({ type }) => type === 'PLAY'),
      [sequencerStepIsCurrentStyles]: props.isCurrent,
      [sequencerStepIsSelectedStyles()]: props.isSelected,
    }}
    onClick={() => props?.onClick?.(props.step)}
    onDblClick={() => props?.onDblClick?.(props.step)}
  >
    &nbsp;
  </div>
  </div>

  </li>
);
