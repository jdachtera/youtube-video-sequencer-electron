import { createMemo, JSXElement, JSX, splitProps } from 'solid-js';
import { css } from 'renderer/emotion-solid';
import { useAppTheme } from './theme';

export const Label = (
  allProps: {
    label?: JSXElement;
    size?: number;
  } & JSX.IntrinsicElements['label']
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
