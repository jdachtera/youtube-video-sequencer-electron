import type { Property } from 'csstype';
import { styled } from '../emotion-solid';

export const Flex = styled('div')<{
  flex?: Property.Flex;
  overflow?: Property.Overflow;
  overflowX?: Property.Overflow;
  overflowY?: Property.Overflow;
  width?: Property.Width;
  height?: Property.Height;
}>`
  label: Flex;
  display: flex;
  flex: ${(p) => p.flex ?? 0};
  overflow: ${(p) => p.overflow};
  overflow-x: ${(p) => p.overflowX};
  overflow-y: ${(p) => p.overflowY};
  overflow: ${(p) => p.overflow};
  width: ${(p) => p.width};
  height: ${(p) => p.height};
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
