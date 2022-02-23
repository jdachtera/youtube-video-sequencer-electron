import { css } from '@emotion/css';
import { Property } from 'csstype';
import { styled } from '../emotion-solid';

export const Flex = styled('div')<{
  flex?: Property.Flex;
  overflow?: Property.Overflow;
  overflowX?: Property.Overflow;
  overflowY?: Property.Overflow;
  width?: Property.Width;
  height?: Property.Height;
}>(
  (p) => css`
    label: Flex;
    display: flex;
    ${p.flex !== undefined ? `flex: ${p.flex};` : ''}
    ${p.overflow !== undefined ? `overflow: ${p.overflow};` : ''}
    ${p.overflowX !== undefined ? `overflow-x: ${p.overflowX};` : ''}
    ${p.overflowY !== undefined ? `overflow-y: ${p.overflowY};` : ''}
    ${p.overflow !== undefined ? `overflow: ${p.overflow};` : ''}
    ${p.width !== undefined ? `width: ${p.width};` : ''}
    ${p.height !== undefined ? `height: ${p.height};` : ''}
  `
);

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
