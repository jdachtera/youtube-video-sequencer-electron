import type { JSX } from 'solid-js';
import { css } from '@emotion/css';

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
              border-top-left-radius: 0;
              border-bottom-left-radius: 0;
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
              border-left: none;
              border-right: none;
            }
          }
          > :first-child {
            padding-right: 0;

            button {
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
              border-right: none;
            }
          }
          > :last-child {
            padding-left: 0;
            button {
              border-top-left-radius: 0;
              border-bottom-left-radius: 0;
              border-left: none;
            }
          }
        `]: true,
        ...props.classList,
      }}
    />
  );
};
