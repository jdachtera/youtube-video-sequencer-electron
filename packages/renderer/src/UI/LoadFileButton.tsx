import { css } from '@emotion/css';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { ButtonWithLabel } from './ButtonWithLabel';

export const LoadFileButton = (
  allProps: { label: string } & JSX.IntrinsicElements['input'],
) => {
  const [props, inputProps] = splitProps(allProps, [
    'label',
    'class',
    'classList',
  ]);

  return (
    <ButtonWithLabel
      {...props}
      classList={{
        [css`
          position: relative;
          cursor: pointer;
        `]: true,
      }}
      labelOnButton={true}
    >
      <input
        {...inputProps}
        class={css`
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
        `}
        type="file"
      ></input>
    </ButtonWithLabel>
  );
};
