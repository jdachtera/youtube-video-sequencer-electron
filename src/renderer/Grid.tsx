import { styled } from 'solid-styled-components';

export const Flex = styled('div')`
  display: flex;
`;

export const Column = styled(Flex)`
  flex-direction: column;
`;

export const Row = styled(Flex)`
  flex-direction: row;
`;
