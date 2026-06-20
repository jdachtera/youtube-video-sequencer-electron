import { css } from '@emotion/css';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { Screw } from './Engraving';

export const RackEar = (
  allProps: JSX.IntrinsicElements['div'] & {
    collapsed?: boolean;
    screwCount?: number;
  },
) => {
  const [, divProps] = splitProps(allProps, ['collapsed', 'screwCount']);
  // A slim, flat grip bar — keeps the click target (collapse / remove) but
  // drops the heavy screw-and-hole skeuomorphism for a cleaner look.
  const rackEarStyle = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 8px;
    flex-shrink: 0;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.12);
    transition: background 0.12s ease;
  `;
  return (
    <div
      {...divProps}
      classList={{
        [rackEarStyle]: true,
        [css`
          cursor: pointer;
          &:hover {
            background: rgba(0, 0, 0, 0.24);
          }
        `]: !!divProps.onClick,
        ...divProps.classList,
      }}
    >
      <div
        class={css`
          width: 3px;
          height: 20px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 1px rgba(0, 0, 0, 0.45);
        `}
      />
    </div>
  );
};

export const RackEar2 = () => {
  return (
    <div
      class={css`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      `}
    >
      <Screw />
      <Screw />
    </div>
  );
};
