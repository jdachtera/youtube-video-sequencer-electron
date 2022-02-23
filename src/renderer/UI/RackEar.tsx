import { splitProps, JSX } from 'solid-js';
import { css } from '../emotion-solid';
import { Screw } from './Engraving';
import { RackMountHole } from './RackMountHole';

export const RackEar = (
  allProps: JSX.IntrinsicElements['div'] & {
    collapsed?: boolean;
    screwCount?: number;
  }
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
          margin: 5px 2px;
        `}
      >
        <Screw width="13px" />
      </RackMountHole>
      <RackMountHole
        class={css`
          margin: 5px 2px;
          display: ${props.collapsed ? 'none' : 'flex'};
        `}
      >
        <Screw width="13px" />
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
