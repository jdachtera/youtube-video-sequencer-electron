import { useTheme as useThemeOriginal } from 'solid-styled-components';

export const theme = {
  colors: {
    primary: 'hotpink',
  },
};

export const useTheme = () => useThemeOriginal() as Theme;

export type Theme = typeof theme;
