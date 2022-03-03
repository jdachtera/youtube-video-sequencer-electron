import type { PropsWithChildren, JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { css } from '@emotion/css';

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

export const LCDFrame = (allProps: JSX.IntrinsicElements['div']) => {
  const [props, divProps] = splitProps(allProps, ['children']);
  return (
    <div
      {...divProps}
      classList={{
        [css`
          position: relative;
          padding: 20px;
          border-radius: 8px;
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

export const LCDLine = (props: PropsWithChildren<{ class?: string }>) => {
  return <div class={props.class ?? ''}>{props.children}</div>;
};
