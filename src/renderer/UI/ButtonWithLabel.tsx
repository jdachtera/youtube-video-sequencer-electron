import { splitProps, JSX, Show, mergeProps } from 'solid-js';
import { css } from '../emotion-solid';
import { Label } from './Label';

export const ButtonWithLabel = (
  allProps: {
    activated?: boolean;
    label: string;
    labelOnButton?: boolean;
  } & JSX.IntrinsicElements['button']
) => {
  const [ownProps, buttonProps] = splitProps(allProps, ['label']);
  const props = mergeProps(
    { activated: false, labelOnButton: false },
    allProps
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
                  box-shadow: 0 0 14px 2px #ff6c27;
                  background: radial-gradient(#ffed4c, #ff810b);
                }
                &:active {
                  border: 2px inset #ffbf47d7;
                }
              `]: true,
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
