import { keyframes, css } from '@emotion/css';
import { adjustHue, darken } from 'polished';
import type { JSX } from 'solid-js';
import { splitProps, Show, mergeProps } from 'solid-js';
import { Label } from './Label';

export const ButtonWithLabel = (
  allProps: {
    activated?: boolean;
    activatedColor?: string;
    label: string;
    labelOnButton?: boolean;
    blinkInterval?: number;
  } & JSX.IntrinsicElements['button'],
) => {
  const [ownProps, buttonProps] = splitProps(allProps, [
    'label',
    'activatedColor',
    'activated',
    'label',
    'labelOnButton',
    'children',
    'blinkInterval',
  ]);

  const props = mergeProps(
    { activated: false, labelOnButton: false, activatedColor: '#ffed4c' },
    ownProps,
  );
  return (
    <div
      classList={{
        [css`
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
        `]: true,
        ...buttonProps.classList,
      }}
    >
      <div
        class={css`
          display: flex;
        `}
      >
        <div
          class={css`
            display: flex;
          `}
        >
          <button
            {...buttonProps}
            type="button"
            classList={{
              activated: props.activated,
              [css`
                cursor: pointer;
                border: 1px solid rgba(0, 0, 0, 0.3);
                padding: 4px 9px;
                border-radius: 3px;
                background: linear-gradient(180deg, #fbfbfb, #dcdcdc);
                box-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);
                font-family: 'oswald';
                font-weight: bold;
                font-size: 14px;
                font-variant: small-caps;
                transition: box-shadow 0.1s ease, background 0.1s ease;
                &:hover {
                  background: linear-gradient(180deg, #ffffff, #e6e6e6);
                }
                &:active,
                &.activated {
                  box-shadow: 0 0 10px 1px
                    ${adjustHue(-23, darken(0.1, props.activatedColor))};
                  background: radial-gradient(
                    ${props.activatedColor},
                    ${adjustHue(-23, darken(0.1, props.activatedColor))}
                  );
                }
                &:active {
                  border-color: ${adjustHue(
                    -23,
                    darken(0.1, props.activatedColor),
                  )};
                }
              `]: true,
              [css`
                animation: ${keyframes`
                  0%,
                  49% {
                    box-shadow: 0 0 14px 2px ${adjustHue(
                      -23,
                      darken(0.1, props.activatedColor),
                    )};
                    background: radial-gradient(
                      ${props.activatedColor},
                      ${adjustHue(-23, darken(0.1, props.activatedColor))}
                    );
                  }
                  50%,
                  100% {
                    background: radial-gradient(#c2c2c2, #fff);
                    box-shadow: none;

                  }
                  `} ${props.blinkInterval}s infinite;
              `]: !!props.blinkInterval,
            }}
          >
            {props.children}
            <Show when={props.labelOnButton}>
              <Label
                label={ownProps.label}
                classList={{
                  [css`
                    &.override {
                      font-size: 12px;
                      color: black;
                      white-space: nowrap;
                      user-select: none;
                      cursor: pointer;
                    }
                  `]: true,
                }}
              />
            </Show>
          </button>
        </div>
      </div>
      <Show when={!props.labelOnButton}>
        <Label
          label={ownProps.label}
          classList={{
            [css`
              &.override {
                margin-left: 20px;
                white-space: nowrap;
              }
            `]: true,
          }}
        />
      </Show>
    </div>
  );
};
