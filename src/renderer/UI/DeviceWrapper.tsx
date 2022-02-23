import { splitProps, JSX, Show } from 'solid-js';
import { css, styled } from '../emotion-solid';
import { BiCompass } from 'solid-icons/bi';
import megarack from '../svg/megarack.png';
import { RackEar } from './RackEar';

export const DeviceWrapper = (
  allProps: JSX.IntrinsicElements['div'] & {
    background?: string;
    onClickLeftRackEar?: (event: MouseEvent) => void;
    onClickRightRackEar?: (event: MouseEvent) => void;
    showLogo?: boolean;
  }
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
          border: 1px #222 solid;
          background: ${props.background ?? '#969696'};
          box-shadow: 0px 0px 2px inset #222;
          border-radius: 4px;
          background-image: url(${megarack});
          background-size: 200px;
        `]: true,
      }}
    >
      <RackEar onClick={(event) => props.onClickLeftRackEar?.(event)} />
      <Show when={props.showLogo}>
        <BiCompass
          color="lavender"
          size="64px"
          class="custom-icon"
          title="a11y"
        />
      </Show>
      <div
        class={css`
          width: 100%;
          margin: 10px 5px;
        `}
      >
        {props.children}
      </div>
      <RackEar onClick={(event) => props.onClickRightRackEar?.(event)} />
    </div>
  );
};

export const DummyDevice = styled(DeviceWrapper)`
  flex: 1;
`;
