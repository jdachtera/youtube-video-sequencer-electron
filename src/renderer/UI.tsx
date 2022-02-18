import { PropsWithChildren, splitProps, JSX, Show, mergeProps } from 'solid-js';

import { css } from 'solid-styled-components';
import { Label } from './controls/Label';
import ScrewHead from './svg/screw_head.svg';
import { BiCompass } from 'solid-icons/bi';

const akaiButtonStyles = css`
  border: 2px outset white;
  border-radius: 3px;
  box-shadow: 0 0 3px 2px #555333;
  background: radial-gradient(#ddd, #fff);
  display: inline-flex;
  padding: 1px;
  div {
    border: 4px outset white;
    border-radius: 5px;
    height: 10px;
    width: 20px;
  }
  &:active {
    border: 2px inset white;
  }
`;

export const LCDLabel = (props: PropsWithChildren<{ minWidth?: string }>) => {
  return (
    <span
      class={css`
        font-family: 'oswald';
        font-size: 14px;
        font-variant: small-caps;
        margin-right: 10px;
        min-width: ${props.minWidth ?? '80px'};
      `}
    >
      {props.children}
    </span>
  );
};

export const LCDLine = (props: PropsWithChildren<{ class?: string }>) => {
  return <div class={props.class ?? ''}>{props.children}</div>;
};

export const PowerSwitch = () => {
  return <div>poweronoff</div>;
};

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
    <div class={rackEarStyle} {...divProps}>
      <RackMountHole
        class={css`
          margin: 10px;
        `}
      >
        <Screw width="25px" />
      </RackMountHole>
      <RackMountHole
        class={css`
          margin: 10px;

          display: ${props.collapsed ? 'none' : 'flex'};
        `}
      >
        <Screw width="25px" />
      </RackMountHole>
      {/* <For each={}>
        {() => (
          <RackMountHole
            class={css`
              margin: 10px;
              margin-top: 20px;
              margin-bottom: 20px;
            `}
          >
            <Screw width="25px" />
          </RackMountHole>
        )}
      </For> */}
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

export const ButtonGroup = (props: JSX.IntrinsicElements['div']) => {
  return (
    <div
      {...props}
      classList={{
        [css`
          display: flex;
          flex-direction: row;
          > :not(:first-child):not(:last-child) {
            padding-left: 0;
            padding-right: 0;
            button {
              border-left: none;
              border-right: none;
            }
          }
          > :first-child {
            padding-right: 0;
            button {
              border-right: none;
            }
          }
          > :last-child {
            padding-left: 0;
            button {
              border-left: none;
            }
          }
        `]: true,
        ...props.classList,
      }}
    />
  );
};

export const ButtonWithLabel = (
  allProps: {
    activated?: boolean;
    label: string;
    labelOnButton?: boolean;
  } & JSX.IntrinsicElements['button']
) => {
  const [ownProps, buttonProps] = splitProps(allProps, ['label']);
  const props = mergeProps(
    { activated: false, labelOnButton: false },
    allProps
  );
  return (
    <div
      class={css`
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px;
      `}
    >
      <div
        class={css`
          box-shadow: 0px 0px 2px 2px #1f1f1fb0;
          border-radius: 2px;
          display: flex;
        `}
      >
        <div
          class={css`
            border-radius: 3px;
            box-shadow: 4px 3px 5px 4px #13131349;
            display: flex;
          `}
        >
          <button
            {...buttonProps}
            type="button"
            classList={{
              activated: props.activated,
              [css`
                cursor: pointer;
                border: 2px outset white;
                padding: 6px;
                border-radius: 2px;
                background: radial-gradient(#c2c2c2, #fff);
                font-family: 'oswald';
                font-weight: bold;
                font-size: 14px;
                font-variant: small-caps;
                &:active,
                &.activated {
                  box-shadow: 0 0 14px 2px #ff6c27;
                  background: radial-gradient(#ffed4c, #ff810b);
                }
                &:active {
                  border: 2px inset #ffbf47d7;
                }
              `]: true,
            }}
          >
            <Show when={props.labelOnButton}>
              <Label
                label={ownProps.label}
                classList={{
                  [css`
                    &.override {
                      font-size: 12px;
                      color: black;
                      white-space: nowrap;
                      user-select: none;
                      cursor: pointer;
                    }
                  `]: true,
                }}
              />
            </Show>
          </button>
        </div>
      </div>
      <Show when={!props.labelOnButton}>
        <Label
          label={ownProps.label}
          classList={{
            [css`
              &.override {
                margin-left: 20px;
                white-space: nowrap;
              }
            `]: true,
          }}
        />
      </Show>
    </div>
  );
};

export const ScreenPrintBackground = (
  props: PropsWithChildren<{
    class?: string;
    background?: string;
    label?: string;
  }>
) => {
  return (
    <div
      class={[
        css`
          background: ${props.background ?? '#ff9100'};
          padding: 10px;
          border-radius: 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        `,
        props.class ?? '',
      ].join(' ')}
    >
      <Show when={props.label}>
        <span
          class={css`
            font-family: 'oswald';
            color: black;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          {props.label}
        </span>
      </Show>

      <div>{props.children}</div>
    </div>
  );
};

export const LCDFrame = (allProps: JSX.IntrinsicElements['div']) => {
  const [props, divProps] = splitProps(allProps, ['children']);
  return (
    <div
      {...divProps}
      classList={{
        [css`
          position: relative;
          padding: 60px;
          border-radius: 8px;
          padding-right: 160px;
          background-color: black;
        `]: true,

        ...divProps.classList,
      }}
    >
      <div
        class={css`
          position: absolute;
          background-color: none;
          border: 2px outset #666;
          padding: 60px;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          border-radius: 8px;
          padding-right: 160px;
          background: radial-gradient(
            ellipse at -66% 90%,
            rgba(0, 0, 0, 0) 71%,
            rgba(196, 228, 255, 0.472) 72%,
            rgb(109 255 249 / 24%) 78%,
            rgba(0, 0, 0, 0) 93%
          );
          z-index: 999;
          pointer-events: none;
        `}
      ></div>
      {props.children}
    </div>
  );
};

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
          display: flex;
          background: ${props.background ?? '#969696'};
          box-shadow: 0 0 2px 2px inset #222;
          padding: 10px;
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
        `}
      >
        {props.children}
      </div>
      <RackEar onClick={(event) => props.onClickRightRackEar?.(event)} />
    </div>
  );
};

const lcdStyles = css`
  display: flex;
  -webkit-appearance: none;
  flex-direction: column;
  background: radial-gradient(#cfcfcf, #b3b3b3);
  color: rgb(63, 63, 63);
  font-size: 20px;
  box-shadow: inset 2px 2px 5px 1px #000000c1;
  border-radius: 3px;
  text-shadow: 1px 1px 1px rgba(119, 119, 119, 0.849);
  padding: 8px;
  font-family: 'chesstype';
`;
export const LCD = (props: JSX.IntrinsicElements['div']) => {
  return (
    <div
      {...props}
      classList={{
        [lcdStyles]: true,
        ...props.classList,
      }}
    />
  );
};

export const InputLCD = (props: JSX.IntrinsicElements['input']) => {
  return (
    <input
      {...props}
      classList={{
        [lcdStyles]: true,
        ...props.classList,
      }}
    />
  );
};

export const RackMountHole = (
  props: PropsWithChildren<{
    class?: string;
    height?: string;
    width?: string;
  }>
) => {
  return (
    <div
      class={[
        css`
          width: ${props.width ?? '30px'};
          height: ${props.height ?? '15px'};
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

export const Engraving = (props: PropsWithChildren<{ class?: string }>) => {
  return (
    <div
      class={[
        css`
          box-shadow: 0 0 1px 1px #585858;
          border-radius: 100%;
          /* margin: 4px; */
          border: 2px inset white;
        `,
        props.class,
      ].join(' ')}
    >
      {props.children}
    </div>
  );
};

export const Screw = (props: { width?: string; class?: string }) => {
  return (
    <img
      src={ScrewHead}
      width={props.width ?? '20px'}
      class={[
        css`
          transform: rotate(${Math.random() * 50}deg);
          display: flex;
        `,
        props.class,
      ].join(' ')}
    />
  );
};

export const ScrewRow = () => {
  return (
    <div
      class={css`
        display: inline-flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      `}
    >
      {/* {renderScrews()} */}
      <Engraving>
        <Screw />
      </Engraving>
      <Screw />
      <Screw />
    </div>
  );
};

export const PlasticButton = () => {
  return <div></div>;
};

export const ModuleFrame = (props: PropsWithChildren) => {
  return (
    <div
      class={css`
        display: flex;
        flex-direction: column;
        margin: 20px;
      `}
    >
      <ScrewRow />
      <div
        class={css`
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 10px;
          padding-left: 20px;
          padding-right: 20px;
        `}
      >
        {props.children}
      </div>
      <ScrewRow />
    </div>
  );
};

export const AkaiButton = (
  props: PropsWithChildren<{
    onClick: () => void;
    label?: string;
  }>
) => {
  const handleClick = () => {
    props.onClick();
  };

  return (
    <button class={akaiButtonStyles} onClick={handleClick}>
      <div></div>
    </button>
  );
};
