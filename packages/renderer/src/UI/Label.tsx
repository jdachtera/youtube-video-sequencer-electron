import { css } from '@emotion/css';
import type { JSXElement, JSX } from 'solid-js';
import { createMemo, splitProps } from 'solid-js';
import { useAppTheme } from './theme';

export const Label = (
  allProps: {
    label?: JSXElement;
    size?: number;
  } & JSX.IntrinsicElements['label'],
) => {
  const [props, labelProps] = splitProps(allProps, ['label', 'size']);

  const theme = useAppTheme();
  const size = createMemo(() => props.size ?? theme.sizes.knobSize);

  return (
    <label
      classList={{
        [css`
          display: block;
          background: none;
          color: ${theme.colors.labelColor};
          text-align: center;
          font-size: ${size() / 5}px;
          font-family: 'Oswald';
          text-transform: uppercase;
          text-shadow: none;
          border: none;
          border-radius: none;
        `]: true,
        override: true,
        ...labelProps.classList,
      }}
    >
      {props.label}
    </label>
  );
};
