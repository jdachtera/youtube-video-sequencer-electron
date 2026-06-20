import { css } from '@emotion/css';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { Screw } from './Engraving';
import { RackMountHole } from './RackMountHole';

export const RackEar = (
  allProps: JSX.IntrinsicElements['div'] & {
    collapsed?: boolean;
    screwCount?: number;
  },
) => {
  const [props, divProps] = splitProps(allProps, ['collapsed', 'screwCount']);
  const rackEarStyle = css`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `;
  return (
    <div
      {...divProps}
      classList={{
        [rackEarStyle]: true,
        [css`
          cursor: pointer;
        `]: !!divProps.onClick,
        ...divProps.classList,
      }}
    >
      <RackMountHole
        class={css`
          margin: 4px 1px;
        `}
      >
        <Screw width="9px" />
      </RackMountHole>
      <RackMountHole
        class={css`
          margin: 4px 1px;
          display: ${props.collapsed ? 'none' : 'flex'};
        `}
      >
        <Screw width="9px" />
      </RackMountHole>
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
