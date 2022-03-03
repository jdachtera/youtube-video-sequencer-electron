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
  ${(p) => (p.flex ? `flex: ${p.flex};` : '')};
  ${(p) => (p.overflow ? `overflow: ${p.overflow};` : '')};
  ${(p) => (p.overflowX ? `overflow-x: ${p.overflowX};` : '')};
  ${(p) => (p.overflowY ? `overflow-y: ${p.overflowY};` : '')};
  ${(p) => (p.overflow ? `overflow: ${p.overflow};` : '')};
  ${(p) => (p.width ? `width: ${p.width};` : '')};
  ${(p) => (p.height ? `height: ${p.height};` : '')};
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
