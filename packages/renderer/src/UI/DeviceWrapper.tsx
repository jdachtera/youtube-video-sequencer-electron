import { css } from '@emotion/css';
import { BiRegularCompass } from 'solid-icons/bi';
import type { JSX } from 'solid-js';
import { splitProps, Show } from 'solid-js';
import { styled } from '../emotion-solid';
import { RackEar } from './RackEar';

export const DeviceWrapper = (
  allProps: JSX.IntrinsicElements['div'] & {
    background?: string;
    onClickLeftRackEar?: (event: MouseEvent) => void;
    onClickRightRackEar?: (event: MouseEvent) => void;
    showLogo?: boolean;
  },
) => {
  const [props, divProps] = splitProps(allProps, [
    'background',
    'children',
    'onClickLeftRackEar',
    'onClickRightRackEar',
    'showLogo',
  ]);
  return (
    <div
      {...divProps}
      classList={{
        ...divProps.classList,
        [css`
          label: DeviceWrapper;
          display: flex;
          border: 1px solid rgba(0, 0, 0, 0.35);
          background-color: ${props.background ?? '#5b5b5b'};
          background-image: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            rgba(0, 0, 0, 0.14)
          );
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          border-radius: 6px;
        `]: true,
      }}
    >
      <RackEar onClick={(event) => props.onClickLeftRackEar?.(event)} />
      <Show when={props.showLogo}>
        <BiRegularCompass
          color="lavender"
          size="64px"
          class="custom-icon"
          title="a11y"
        />
      </Show>
      <div
        class={css`
          width: 100%;
          margin: 5px 4px;
        `}
      >
        {props.children}
      </div>
      <RackEar
        variant="delete"
        title="Remove device"
        onClick={(event) => props.onClickRightRackEar?.(event)}
      />
    </div>
  );
};

export const DummyDevice = styled(DeviceWrapper)`
  flex: 1;
`;
