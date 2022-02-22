import { splitProps, Show, ComponentProps, JSXElement } from 'solid-js';
import { css } from 'renderer/emotion-solid';
import { Column, Row } from './Grid';
import { InputLCD } from './lcdStyles';
import { ButtonWithLabel } from './ButtonWithLabel';

export const InputWithArrowButtons = (
  allProps: {
    label?: JSXElement;
    onClickUp: (event: MouseEvent) => void;
    onClickDown: (event: MouseEvent) => void;
  } & ComponentProps<typeof InputLCD>
) => {
  const [props, inputProps] = splitProps(allProps, [
    'label',
    'onClickUp',
    'onClickDown',
  ]);

  const buttonStyles = css`
    padding: 0px;
    button {
      padding: 0px;
      label.override {
        font-size: 10px;
      }
    }
  `;

  return (
    <Row
      classList={{
        [css`
          margin: 0 5px;
          align-items: center;
          justify-content: center;
        `]: true,
      }}
    >
      <Column
        class={css`
          align-items: center;
          justify-items: center;
        `}
      >
        <Show when={props.label}>
          <label
            class={css`
              font-size: 14px;
              color: black;
              font-family: 'Oswald';
              text-transform: uppercase;
              margin-top: -20px;
              display: block;
              padding-left: 2px;
            `}
          >
            {props.label}
          </label>
        </Show>
        <Row>
          <div>
            <InputLCD
              {...inputProps}
              classList={{
                [css`
                  text-align: right;
                `]: true,
              }}
            />
          </div>
          <Column
            classList={{
              [css`
                padding: 2px;
              `]: true,
            }}
          >
            <ButtonWithLabel
              label="▲"
              classList={{
                [buttonStyles]: true,
              }}
              labelOnButton={true}
              onClick={(event) => props.onClickUp(event)}
            ></ButtonWithLabel>
            <ButtonWithLabel
              label="▼"
              classList={{
                [buttonStyles]: true,
              }}
              labelOnButton={true}
              onClick={(event) => props.onClickDown(event)}
            ></ButtonWithLabel>
          </Column>
        </Row>
      </Column>
    </Row>
  );
};
