import type { CSSInterpolation } from '@emotion/css';
import { css, injectGlobal } from '@emotion/css';
import type { PropsWithChildren, JSX } from 'solid-js';
import { createContext, useContext, mergeProps, splitProps } from 'solid-js';
import { createComponent, spread } from 'solid-js/web';
import { isFunction } from 'tone';

const ThemeContext = createContext();

export function ThemeProvider<T extends Record<string, unknown>>(
  props: PropsWithChildren<{
    theme: T;
  }>,
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

export const styled =
  <T extends keyof JSX.IntrinsicElements, P extends JSX.IntrinsicElements[T]>(
    ComponentOrTag: T | ((props: P) => JSX.Element),
  ) =>
  <OwnProps extends Record<string, unknown>>(
    ...args: (TemplateStringsArray | ((props: P & OwnProps) => unknown))[]
  ) =>
  (props: P & OwnProps) => {
    const [ownProps, componentProps] = splitProps(props, [
      'classList',
      'class',
      'className',
    ]);

    const newProps = mergeProps(
      {
        // eslint-disable-next-line solid/reactivity
        get classList() {
          const className = css(
            {
              ...(typeof ComponentOrTag === 'function' && {
                label: ComponentOrTag.name,
              }),
            },
            args.reduce((prev, current) => {
              return `${prev}${isFunction(current) ? current(props) : current}`;
            }, ''),
          );

          const classNames = [
            ...((props.class as string)?.split(' ') ?? []),
            ...((props.className as string)?.split(' ') ?? []),
          ];

          const classList = {
            [className]: true,
            ...ownProps.classList,
            ...Object.fromEntries(
              classNames.map((className) => [className, true]),
            ),
          };

          return classList;
        },
      },
      componentProps,
    );

    if (typeof ComponentOrTag === 'function') {
      return createComponent(ComponentOrTag, newProps as P);
    } else {
      const el = document.createElement(ComponentOrTag);
      spread(el, newProps);
      return el;
    }
  };
