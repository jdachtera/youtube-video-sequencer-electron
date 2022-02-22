import { Property } from 'csstype';
import { css, CSSInterpolation, injectGlobal } from '@emotion/css';
import {
  createContext,
  PropsWithChildren,
  useContext,
  JSX,
  mergeProps,
  splitProps,
  ComponentProps,
} from 'solid-js';
import { createComponent, spread } from 'solid-js/web';

const ThemeContext = createContext();

export function ThemeProvider<T extends Record<string, unknown>>(
  props: PropsWithChildren<{
    theme: T;
  }>
) {
  return (
    <ThemeContext.Provider value={props.theme}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export const createGlobalStyles =
  (template: TemplateStringsArray, ...args: Array<CSSInterpolation>) =>
  () => {
    injectGlobal(template, ...args);
    return null;
  };

export { css };

export const styled =
  <T extends keyof JSX.IntrinsicElements, P extends JSX.IntrinsicElements[T]>(
    ComponentOrTag: T | ((props: P) => JSX.Element)
  ) =>
  <OwnProps extends Record<string, unknown>>(
    template: TemplateStringsArray | ((props: P & OwnProps) => string)
  ) =>
  (props: P & OwnProps) => {
    const [ownProps, componentProps] = splitProps(props, [
      'classList',
      'class',
      'className',
    ]);

    const newProps = mergeProps(
      {
        get classList() {
          const className =
            typeof template === 'function' ? template(props) : css(template);

          const classNames = [
            ...((props.class as string)?.split(' ') ?? []),
            ...((props.className as string)?.split(' ') ?? []),
          ];

          const classList = {
            [className]: true,
            ...ownProps.classList,
            ...Object.fromEntries(
              classNames.map((className) => [className, true])
            ),
          };

          return classList;
        },
      },
      componentProps
    );

    if (typeof ComponentOrTag === 'function') {
      return createComponent(ComponentOrTag, newProps as P);
    } else {
      const el = document.createElement(ComponentOrTag);
      spread(el, newProps);
      return el;
    }
  };
