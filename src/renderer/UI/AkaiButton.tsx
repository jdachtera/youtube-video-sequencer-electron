import { css } from '@emotion/css';
import { PropsWithChildren } from 'solid-js';

export const akaiButtonStyles = css`
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
