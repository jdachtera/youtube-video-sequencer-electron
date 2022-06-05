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
          box-shadow: 0px 0px 2px 2px #1f1f1fb0;
          border-radius: 2px;
          display: flex;
        `}
      >
        <div
          class={css`
            border-radius: 3px;
            box-shadow: 4px 3px 5px 4px #13131349;
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
                border: 2px outset white;
                padding: 6px;
                border-radius: 2px;
                background: radial-gradient(#c2c2c2, #fff);
                font-family: 'oswald';
                font-weight: bold;
                font-size: 14px;
                font-variant: small-caps;
                &:active,
                &.activated {
                  box-shadow: 0 0 14px 2px
                    ${adjustHue(-23, darken(0.1, props.activatedColor))};
                  background: radial-gradient(
                    ${props.activatedColor},
                    ${adjustHue(-23, darken(0.1, props.activatedColor))}
                  );
                }
                &:active {
                  border: 2px inset
                    ${adjustHue(-23, darken(0.1, props.activatedColor))};
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
