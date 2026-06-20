import { css } from '@emotion/css';
import type { PropsWithChildren } from 'solid-js';

export const RackMountHole = (
  props: PropsWithChildren<{
    class?: string;
    height?: string;
    width?: string;
  }>,
) => {
  return (
    <div
      class={[
        css`
          width: ${props.width ?? '10px'};
          height: ${props.height ?? '4px'};
          background-color: black;
          border-radius: 14px;
          border: 2px inset white;
          box-shadow: 0 0 4px 2px inset #222;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
        props.class,
      ].join(' ')}
    >
      {props.children}
    </div>
  );
};
