import { css } from '@emotion/css';
import type { JSX } from 'solid-js';
import { Show, splitProps } from 'solid-js';

export const ScreenPrintBackground = (
  allProps: {
    class?: string;
    background?: string;
    label?: string;
  } & JSX.IntrinsicElements['div'],
) => {
  const [props, divProps] = splitProps(allProps, [
    'class',
    'background',
    'label',
    'children',
  ]);
  return (
    <div
      {...divProps}
      class={[
        css`
          background: ${props.background ?? '#ff9100'};
          padding: 15px;
          border-radius: 5px;
          display: flex;
          flex-direction: column;
          margin: 5px 0;
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
