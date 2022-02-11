import { css } from 'solid-styled-components';
import { Label } from './Label';
import ScrewHead from './svg/screw_head.svg';

import { PropsWithChildren, splitProps, JSX } from 'solid-js';

const rackEarStyle = css`
  display: flex;
  flex-direction: column;
  box-shadow: 0px 0px 1px 1px #3f3f3fae;
  justify-content: space-between;
`;

const akaiButtonStyles = css`
  border: 2px outset white;
  border-radius: 3px;
  box-shadow: 0 0 3px 2px #555333;
  background: radial-gradient(#ddd, #fff);
  display: inline-block;
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

export const LCDLine = (props: PropsWithChildren) => {
  return <div>{props.children}</div>;
};

export const PowerSwitch = () => {
  return <div>poweronoff</div>;
};

export const RackEar = (props: PropsWithChildren<{ onClick?: () => void }>) => {
  return (
    <div class={rackEarStyle} onClick={() => props.onClick?.()}>
      <RackMountHole
        class={css`
          margin: 10px;
          margin-top: 20px;
        `}
      >
        <Screw width="25px" />
      </RackMountHole>
      <RackMountHole
        class={css`
          margin: 10px;
          margin-bottom: 20px;
        `}
      >
        <Screw width="25px" />
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

export const ButtonWithLabel = (
  props: {
    label: string;
  } & JSX.IntrinsicElements['button']
) => {
  const [ownProps, buttonProps] = splitProps(props, ['label']);
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
        `}
      >
        <div
          class={css`
            border-radius: 3px;
            box-shadow: 4px 3px 5px 4px #13131349;
          `}
        >
          <button
            {...buttonProps}
            type="button"
            class={css`
              border: 2px outset white;
              padding: 6px;
              border-radius: 2px;
              background: radial-gradient(#c2c2c2, #fff);
              font-family: 'oswald';
              font-weight: bold;
              font-size: 14px;
              font-variant: small-caps;
              &:active {
                border: 2px inset #ffbf47d7;
                box-shadow: 0 0 14px 2px #ff6c27;
                background: radial-gradient(#ffed4c, #ff810b);
              }
            `}
          />
        </div>
      </div>
      <Label
        label={ownProps.label}
        class={css`
          margin-left: 20px;
          white-space: nowrap;
        `}
      />
    </div>
  );
};

export const LCDFrame = (props: PropsWithChildren) => {
  return (
    <div
      class={css`
        position: relative;
        padding: 60px;
        border-radius: 12px;
        padding-right: 160px;
        background-color: black;
      `}
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
          border-radius: 12px;
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

export const Device = (props: PropsWithChildren<{ class?: string }>) => {
  return (
    <div
      class={[
        css`
          display: flex;
        `,
        props.class,
      ].join(' ')}
    >
      <RackEar />
      <div
        class={css`
          width: 100%;
        `}
      >
        {props.children}
      </div>
      <RackEar />
    </div>
  );
};

export const LCD = (props: PropsWithChildren) => {
  return (
    <div
      class={css`
        display: flex;
        flex-direction: column;
        background: radial-gradient(#cfcfcf, #b3b3b3);
        color: rgb(63, 63, 63);
        font-size: 20px;
        box-shadow: inset 2px 2px 5px 1px #000000c1;
        border-radius: 3px;
        text-shadow: 1px 1px 1px rgba(119, 119, 119, 0.849);
        padding: 8px;
        font-family: 'chesstype';
      `}
    >
      {props.children}
    </div>
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

export const AkaiButton = () => {
  return (
    <div class={akaiButtonStyles}>
      <div></div>
    </div>
  );
};
