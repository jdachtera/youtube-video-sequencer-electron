import { createMemo, JSXElement } from 'solid-js';
import { css } from 'solid-styled-components';
import { useAppTheme } from './theme';

export const Label = (props: { label?: JSXElement; size?: number }) => {
  const theme = useAppTheme();
  const size = createMemo(() => props.size ?? theme.sizes.knobSize);

  return (
    <label
      class={css`
        display: block;
        background: ${theme.colors.lcdBackground};
        color: ${theme.colors.lcdText};
        border: ${size() / 50}px ${theme.colors.lcdBorder} solid;
        border-radius: ${theme.sizes.labelBorderRadius};
        text-align: center;
        font-size: ${size() / 5}px;
      `}
    >
      {props.label}
    </label>
  );
};
