import { styled } from 'renderer/emotion-solid';

export const Flex = styled('div')`
  label: Flex;
  display: flex;
`;

export const Column = styled(Flex)`
  label: Column;
  flex-direction: column;
`;

export const Row = styled(Flex)`
  label: Row;
  flex-direction: row;
`;
