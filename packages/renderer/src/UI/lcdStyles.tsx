import { css } from '@emotion/css';
import type { JSX } from 'solid-js';

const lcdStyles = css`
  display: flex;
  -webkit-appearance: none;
  flex-direction: column;
  background: radial-gradient(#cfcfcf, #b3b3b3);
  color: rgb(63, 63, 63);
  font-size: 15px;
  box-shadow: inset 2px 2px 5px 1px #000000c1;
  border-radius: 3px;
  text-shadow: 1px 1px 1px rgba(119, 119, 119, 0.849);
  padding: 6px;
  font-family: '7seg';
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
