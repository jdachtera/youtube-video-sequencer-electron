import { PropsWithChildren, Show } from 'solid-js';
import { css } from '../emotion-solid';

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
