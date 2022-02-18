import { ComponentProps, JSX } from 'solid-js';
import { css } from 'solid-styled-components';

export const Flex = (props: JSX.IntrinsicElements['div']) => (
  <div
    {...props}
    classList={{
      [css`
        display: flex;
      `]: true,
      ...props.classList,
    }}
  />
);

export const Column = (props: ComponentProps<typeof Flex>) => (
  <Flex
    {...props}
    classList={{
      [css`
        flex-direction: column;
      `]: true,
      ...props.classList,
    }}
  />
);

export const Row = (props: ComponentProps<typeof Flex>) => (
  <Flex
    {...props}
    classList={{
      [css`
        flex-direction: row;
      `]: true,
      ...props.classList,
    }}
  />
);
