import { createMemo, JSXElement } from 'solid-js';
import { css } from 'solid-styled-components';
import { useAppTheme } from '../theme';

export const Label = (props: {
  label?: JSXElement;
  size?: number;
  class?: string;
}) => {
  const theme = useAppTheme();
  const size = createMemo(() => props.size ?? theme.sizes.knobSize);

  return (
    <label
      class={[
        css`
          display: block;
          background: none;
          color: ${theme.colors.labelColor};
          /* border: ${size() / 50}px ${theme.colors.lcdBorder} solid; */
          //border: none;
          //border-radius: ${theme.sizes.labelBorderRadius};
          text-align: center;
          font-size: ${size() / 5}px;
          font-family: 'Oswald';
          text-transform: uppercase;
          text-shadow: none;
          border: none;
          border-radius: none;
        `,
        props.class ?? '',
      ].join(' ')}
    >
      {props.label}
    </label>
  );
};
