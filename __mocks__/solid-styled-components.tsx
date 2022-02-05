import { PropsWithChildren } from 'solid-js';

export const ThemeProvider = jest
  .fn()
  .mockImplementation((props: PropsWithChildren) => (
    <div>{props.children}</div>
  ));

export const useTheme = jest.fn().mockImplementation(() => {
  const { theme } = jest.requireActual('renderer/theme');
  return theme;
});

export const css = jest.fn().mockImplementation(() => '');
