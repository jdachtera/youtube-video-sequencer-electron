import {
  PropsWithChildren,
  splitProps,
  JSX,
  Show,
  mergeProps,
  ComponentProps,
  createMemo,
  JSXElement,
  createSignal,
} from 'solid-js';

import { css } from 'renderer/emotion-solid';
import { Label } from './controls/Label';
import ScrewHead from './svg/screw_head.svg';
import { BiCompass } from 'solid-icons/bi';
import { Column, Row } from './Grid';
import { isNumber } from 'tone';

import megarack from './svg/megarack.png';

const akaiButtonStyles = css`
  border: 2px outset white;
  border-radius: 3px;
  box-shadow: 0 0 3px 2px #555333;
  background: radial-gradient(#ddd, #fff);
  display: inline-flex;
  padding: 1px;
  div {
    border: 4px outset white;
    border-radius: 5px;
    height: 10px;
    width: 20px;
  }
  &:active {
    border: 2px inset white;
  }
`;

export const LCDLabel = (props: PropsWithChildren<{ minWidth?: string }>) => {
  return (
    <span
      class={css`
        font-family: 'oswald';
        font-size: 14px;
        font-variant: small-caps;
        margin-right: 10px;
        min-width: ${props.minWidth ?? '80px'};
      `}
    >
      {props.children}
    </span>
  );
};

export const LCDLine = (props: PropsWithChildren<{ class?: string }>) => {
  return <div class={props.class ?? ''}>{props.children}</div>;
};

export const PowerSwitch = () => {
  return <div>poweronoff</div>;
};

export const RackEar = (
  allProps: JSX.IntrinsicElements['div'] & {
    collapsed?: boolean;
    screwCount?: number;
  }
) => {
  const [props, divProps] = splitProps(allProps, ['collapsed', 'screwCount']);
  const rackEarStyle = css`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `;
  return (
    <div
      {...divProps}
      classList={{
        [rackEarStyle]: true,
        [css`
          cursor: pointer;
        `]: !!divProps.onClick,
        ...divProps.classList,
      }}
    >
      <RackMountHole
        class={css`
          margin: 5px 2px;
        `}
      >
        <Screw width="13px" />
      </RackMountHole>
      <RackMountHole
        class={css`
          margin: 5px 2px;
          display: ${props.collapsed ? 'none' : 'flex'};
        `}
      >
        <Screw width="13px" />
      </RackMountHole>
    </div>
  );
};

export const RackEar2 = () => {
  return (
    <div
      class={css`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      `}
    >
      <Screw />
      <Screw />
    </div>
  );
};

export const NumberInputWithArrowButtons = (
  allProps: {
    value: number;
    onChange?: (value: number) => void;
    step?: number | ((cursorPosition: number | null) => number);
    min?: number;
    max?: number;
    format?: (value: number) => string;
    parse?: (value: string) => number;
  } & Omit<
    ComponentProps<typeof InputWithArrowButtons>,
    'value' | 'onChange' | 'onClickUp' | 'onClickDown' | 'step' | 'min' | 'max'
  >
) => {
  const [propsWithoutDefaults, inputProps] = splitProps(allProps, [
    'onChange',
    'value',
    'min',
    'max',
    'step',
    'parse',
    'format',
  ]);

  const props = mergeProps(
    {
      step: 1 as number | ((cursorPosition: number | null) => number),
      max: Infinity,
      min: -Infinity,
      parse: (value: string) => +value,
      format: (value: number) => `${value}`,
    },
    propsWithoutDefaults
  );

  const [cursorPosition, setCursorPosition] = createSignal<number | null>(0);

  const step = () =>
    isNumber(props.step) ? props.step : props.step(cursorPosition());

  const triggerChange = (value: number) =>
    props.onChange?.(Math.min(Math.max(props.min, value), props.max));

  const handleUp = () => triggerChange(props.value + step());
  const handleDown = () => triggerChange(props.value - step());

  return (
    <InputWithArrowButtons
      {...inputProps}
      value={props.format(props.value)}
      onKeyDown={(event) => {
        setCursorPosition(event.currentTarget.selectionStart);
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            handleUp();
            event.currentTarget.selectionStart = cursorPosition();
            event.currentTarget.selectionEnd = cursorPosition();
            break;
          case 'ArrowDown':
            event.preventDefault();
            handleDown();
            event.currentTarget.selectionStart = cursorPosition();
            event.currentTarget.selectionEnd = cursorPosition();
            break;
        }
      }}
      onClickUp={handleUp}
      onClickDown={handleDown}
      onchange={(event) => {
        const parsedValue = props.parse(event.currentTarget.value);
        triggerChange(isNaN(parsedValue) ? props.value : parsedValue);
      }}
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export const SelectWithArrowButtons = <Option extends unknown>(
  allProps: {
    selectedOption: Option;
    options: Option[];
    optionLabel?: (option: Option) => string;
    onChange: (value: Option) => void;
  } & Omit<
    ComponentProps<typeof InputWithArrowButtons>,
    'value' | 'onChange' | 'onClickUp' | 'onClickDown' | 'step' | 'min' | 'max'
  >
) => {
  const [props, inputProps] = splitProps(allProps, [
    'onChange',
    'selectedOption',
    'options',
    'optionLabel',
  ]);

  const currentIndex = createMemo(() =>
    props.options.indexOf(props.selectedOption)
  );

  const triggerChange = (value: number) => {
    const index = Math.min(Math.max(0, value), props.options.length - 1);
    props.onChange(props.options[index]);
  };

  const handleUp = () => triggerChange(currentIndex() + 1);
  const handleDown = () => triggerChange(currentIndex() - 1);

  return (
    <InputWithArrowButtons
      {...inputProps}
      readonly
      value={
        props.optionLabel
          ? props.optionLabel(props.selectedOption)
          : `${props.selectedOption as string}`
      }
      onKeyDown={(event) => {
        switch (event.key) {
          case 'ArrowUp':
            return handleUp();
          case 'ArrowDown':
            return handleDown();
        }
      }}
      onClickUp={handleUp}
      onClickDown={handleDown}
    />
  );
};

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

export const ButtonGroup = (props: JSX.IntrinsicElements['div']) => {
  return (
    <div
      {...props}
      classList={{
        [css`
          display: flex;
          flex-direction: row;
          > :not(:first-child):not(:last-child) {
            padding-left: 0;
            padding-right: 0;

            button {
              border-top-left-radius: 0;
              border-bottom-left-radius: 0;
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
              border-left: none;
              border-right: none;
            }
          }
          > :first-child {
            padding-right: 0;

            button {
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
              border-right: none;
            }
          }
          > :last-child {
            padding-left: 0;
            button {
              border-top-left-radius: 0;
              border-bottom-left-radius: 0;
              border-left: none;
            }
          }
        `]: true,
        ...props.classList,
      }}
    />
  );
};

export const LoadFileButton = (
  allProps: { label: string } & JSX.IntrinsicElements['input']
) => {
  const [props, inputProps] = splitProps(allProps, ['label']);
  return (
    <div
      classList={{
        [css`
          position: relative;
          cursor: pointer;
        `]: true,
      }}
    >
      <ButtonWithLabel label={props.label} labelOnButton={true}>
        <input
          {...inputProps}
          class={css`
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
          `}
          type="file"
        ></input>
      </ButtonWithLabel>
    </div>
  );
};

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

export const ScreenPrintBackground = (
  props: PropsWithChildren<{
    class?: string;
    background?: string;
    label?: string;
  }>
) => {
  return (
    <div
      class={[
        css`
          background: ${props.background ?? '#ff9100'};
          padding: 10px;
          border-radius: 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        `,
        props.class ?? '',
      ].join(' ')}
    >
      <Show when={props.label}>
        <span
          class={css`
            font-family: 'oswald';
            color: black;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          {props.label}
        </span>
      </Show>

      <div>{props.children}</div>
    </div>
  );
};

export const LCDFrame = (allProps: JSX.IntrinsicElements['div']) => {
  const [props, divProps] = splitProps(allProps, ['children']);
  return (
    <div
      {...divProps}
      classList={{
        [css`
          position: relative;
          padding: 20px;
          border-radius: 8px;
          background-color: black;
        `]: true,

        ...divProps.classList,
      }}
    >
      <div
        class={css`
          position: absolute;
          background-color: none;
          border: 2px outset #666;
          padding: 60px;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          border-radius: 8px;
          background: radial-gradient(
            ellipse at -66% 90%,
            rgba(0, 0, 0, 0) 71%,
            rgba(196, 228, 255, 0.472) 72%,
            rgb(109 255 249 / 24%) 78%,
            rgba(0, 0, 0, 0) 93%
          );
          z-index: 999;
          pointer-events: none;
        `}
      ></div>
      {props.children}
    </div>
  );
};

export const DeviceWrapper = (
  allProps: JSX.IntrinsicElements['div'] & {
    background?: string;
    onClickLeftRackEar?: (event: MouseEvent) => void;
    onClickRightRackEar?: (event: MouseEvent) => void;
    showLogo?: boolean;
  }
) => {
  const [props, divProps] = splitProps(allProps, [
    'background',
    'children',
    'onClickLeftRackEar',
    'onClickRightRackEar',
    'showLogo',
  ]);
  return (
    <div
      {...divProps}
      classList={{
        ...divProps.classList,
        [css`
          display: flex;

          border: 1px #222 solid;
          background: ${props.background ?? '#969696'};
          box-shadow: 0px 0px 2px inset #222;
          border-radius: 4px;
          background-image: url(${megarack});
          background-size: 200px;
        `]: true,
      }}
    >
      <RackEar onClick={(event) => props.onClickLeftRackEar?.(event)} />
      <Show when={props.showLogo}>
        <BiCompass
          color="lavender"
          size="64px"
          class="custom-icon"
          title="a11y"
        />
      </Show>
      <div
        class={css`
          width: 100%;
          margin: 10px 5px;
        `}
      >
        {props.children}
      </div>
      <RackEar onClick={(event) => props.onClickRightRackEar?.(event)} />
    </div>
  );
};

const lcdStyles = css`
  display: flex;
  -webkit-appearance: none;
  flex-direction: column;
  background: radial-gradient(#cfcfcf, #b3b3b3);
  color: rgb(63, 63, 63);
  font-size: 20px;
  box-shadow: inset 2px 2px 5px 1px #000000c1;
  border-radius: 3px;
  text-shadow: 1px 1px 1px rgba(119, 119, 119, 0.849);
  padding: 8px;
  font-family: 'chesstype';
`;
export const LCD = (props: JSX.IntrinsicElements['div']) => {
  return (
    <div
      {...props}
      classList={{
        [lcdStyles]: true,
        ...props.classList,
      }}
    />
  );
};

export const InputLCD = (props: JSX.IntrinsicElements['input']) => {
  return (
    <input
      {...props}
      classList={{
        [lcdStyles]: true,
        ...props.classList,
      }}
    />
  );
};

export const RackMountHole = (
  props: PropsWithChildren<{
    class?: string;
    height?: string;
    width?: string;
  }>
) => {
  return (
    <div
      class={[
        css`
          width: ${props.width ?? '14px'};
          height: ${props.height ?? '4px'};
          background-color: black;
          border-radius: 14px;
          border: 2px inset white;
          box-shadow: 0 0 4px 2px inset #222;
          display: flex;
          align-items: center;
          justify-content: center;
        `,
        props.class,
      ].join(' ')}
    >
      {props.children}
    </div>
  );
};

export const formatPercentage =
  (fractionDigits = 2, padStart = 3) =>
  (value: number) => {
    const fractionDivisor = Math.pow(10, fractionDigits);
    const percentValue = value * 100;
    const fraction = percentValue % 1;

    const digits = Math.round(fraction * fractionDivisor) / fractionDivisor;

    return [
      `${Math.round(percentValue)}`.padStart(padStart, '0'),
      ...(fractionDigits > 0
        ? [`${digits}`.padStart(fractionDigits, '0')]
        : []),
    ].join('.');
  };

export const formattedTimeStep = (cursorPosition: number | null) => {
  if (cursorPosition === null) return 1;

  return (
    [
      3600 * 100,
      3600 * 100,
      3600 * 10,
      3600,
      60 * 10,
      60 * 10,
      60,
      10,
      10,
      1,
      1 / 10,
      1 / 10,
      1 / 100,
      1 / 1000,
      1 / 10000,
    ][cursorPosition] ?? 1
  );
};

export const parseFormattedTime = (formattedTime: string) => {
  const segments = formattedTime.split(':');
  if (segments.length === 4) {
    return (
      +segments[0] * 3600 +
      +segments[1] * 60 +
      +segments[2] +
      +segments[3].padEnd(4) / 10000
    );
  }
  return NaN;
};

export const formatTime = (time: number) => {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time - hours * 3600) / 60);
  const seconds = Math.floor(time - hours * 3600 - minutes * 60);
  const fraction = Math.floor(
    (time - hours * 3600 - minutes * 60 - seconds) * 10000
  );

  return [
    `${hours}`.padStart(3, '0'),
    `${minutes}`.padStart(2, '0'),
    `${seconds}`.padStart(2, '0'),
    `${fraction}`.padStart(4, '0'),
  ].join(':');
};

export const Engraving = (props: PropsWithChildren<{ class?: string }>) => {
  return (
    <div
      class={[
        css`
          box-shadow: 0 0 1px 1px #585858;
          border-radius: 100%;
          /* margin: 4px; */
          border: 2px inset white;
        `,
        props.class,
      ].join(' ')}
    >
      {props.children}
    </div>
  );
};

export const Screw = (props: { width?: string; class?: string }) => {
  return (
    <img
      src={ScrewHead}
      width={props.width ?? '20px'}
      class={[
        css`
          transform: rotate(${Math.random() * 50}deg);
          display: flex;
        `,
        props.class,
      ].join(' ')}
    />
  );
};

export const ScrewRow = () => {
  return (
    <div
      class={css`
        display: inline-flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      `}
    >
      {/* {renderScrews()} */}
      <Engraving>
        <Screw />
      </Engraving>
      <Screw />
      <Screw />
    </div>
  );
};

export const PlasticButton = () => {
  return <div></div>;
};

export const ModuleFrame = (props: PropsWithChildren) => {
  return (
    <div
      class={css`
        display: flex;
        flex-direction: column;
        margin: 20px;
      `}
    >
      <ScrewRow />
      <div
        class={css`
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 10px;
          padding-left: 20px;
          padding-right: 20px;
        `}
      >
        {props.children}
      </div>
      <ScrewRow />
    </div>
  );
};

export const AkaiButton = (
  props: PropsWithChildren<{
    onClick: () => void;
    label?: string;
  }>
) => {
  const handleClick = () => {
    props.onClick();
  };

  return (
    <button class={akaiButtonStyles} onClick={handleClick}>
      <div></div>
    </button>
  );
};
