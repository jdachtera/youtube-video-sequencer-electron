import { css } from '@emotion/css';
import type { JSX } from 'solid-js';
import { Show, splitProps } from 'solid-js';
import { Screw } from './Engraving';

export const RackEar = (
  allProps: JSX.IntrinsicElements['div'] & {
    collapsed?: boolean;
    screwCount?: number;
    // 'grip' (default) is the collapse handle; 'delete' shows a clear ✕ that
    // turns red on hover, so removing a device reads as a destructive action.
    variant?: 'grip' | 'delete';
  },
) => {
  const [own, divProps] = splitProps(allProps, [
    'collapsed',
    'screwCount',
    'variant',
  ]);
  const isDelete = () => own.variant === 'delete';
  // A slim, flat grip bar — keeps the click target (collapse / remove) but
  // drops the heavy screw-and-hole skeuomorphism for a cleaner look.
  const rackEarStyle = css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.12);
    color: rgba(255, 255, 255, 0.55);
    transition: background 0.12s ease, color 0.12s ease;
  `;
  return (
    <div
      {...divProps}
      classList={{
        [rackEarStyle]: true,
        [css`
          width: 8px;
        `]: !isDelete(),
        [css`
          width: 16px;
        `]: isDelete(),
        [css`
          cursor: pointer;
          &:hover {
            background: rgba(0, 0, 0, 0.24);
          }
        `]: !!divProps.onClick && !isDelete(),
        [css`
          cursor: pointer;
          &:hover {
            background: #c0392b;
            color: #fff;
          }
        `]: !!divProps.onClick && isDelete(),
        ...divProps.classList,
      }}
    >
      <Show
        when={isDelete()}
        fallback={
          <div
            class={css`
              width: 3px;
              height: 20px;
              border-radius: 3px;
              background: rgba(255, 255, 255, 0.4);
              box-shadow: 0 0 1px rgba(0, 0, 0, 0.45);
            `}
          />
        }
      >
        <span
          class={css`
            font-size: 13px;
            line-height: 1;
            user-select: none;
          `}
        >
          ✕
        </span>
      </Show>
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
