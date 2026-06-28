import { css } from '@emotion/css';
import type { PropsWithChildren, JSX } from 'solid-js';
import { splitProps } from 'solid-js';

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
          /* Decorative screen-glare overlay, inset to fill the frame. It has no
             content, so the old 60px padding only inflated the box: at 120px of
             vertical padding it couldn't fit the (~81px) collapsed frame, so the
             box overflowed downward and drew its border and gradient over the
             devices below. Drop the padding (and pin border-box) so the glare is
             always clipped to the LCD. */
          box-sizing: border-box;
          background-color: none;
          border: 2px outset #666;
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
          /* Just above the LCD's own content (z-index auto). The parent isn't a
             stacking context, so keep this low — a high value would leak out and
             paint over menus/popovers (the "Add effect" popover is z-index 20). */
          z-index: 1;
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
