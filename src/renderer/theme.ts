import { useTheme } from 'solid-styled-components';

export const theme = {
  colors: {
    primary: 'hotpink',
    lcdBackground: '#b3b3b3',
    lcdBorder: '#5e5e5e',
    lcdText: 'rgba(37, 37, 37, 0.774)',
  },
  sizes: {
    labelBorderRadius: '3px',
    knobSize: 120,
    toggleSize: 50,
    controlMargin: 10,
  },
};

export const useAppTheme = () => useTheme() as Theme;

export type Theme = typeof theme;
