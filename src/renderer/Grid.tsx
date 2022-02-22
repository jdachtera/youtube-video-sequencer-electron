import { styled } from 'renderer/emotion-solid';

export const Flex = styled('div')`
  label: Flex;

  display: flex;
`;

export const Column = styled(Flex)`
  label: Column;
  flex-direction: column;
  > * {
    flex: 0 0 auto;
  }
`;

export const Row = styled(Flex)`
  label: Row;
  > * {
    flex: 0 0 auto;
  }
  flex-direction: row;
`;
