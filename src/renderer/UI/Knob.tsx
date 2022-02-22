import {
  Component,
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  JSXElement,
  mergeProps,
  splitProps,
  untrack,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { css } from 'renderer/emotion-solid';

import MoogKnobSvg from '../svg/moog_knob.svg';
import { useAppTheme } from './theme';
import { Label } from './Label';
import { NumberInputWithArrowButtons } from 'renderer/UI/NumberInputWithArrowButtons';
import { LCDLabel } from 'renderer/UI/LCD';

type KnobProps = {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  speed?: number;
  logarithmic?: boolean;
  fineIsDefault?: boolean;
  initialRotation?: number;
  onChange: (newValue: number) => void;
  style?: JSX.CSSProperties;
  component: Component<{
    onWheel: (event: WheelEvent) => void;
    onMouseDown: (event: MouseEvent) => void;
    rotation: number;
  }>;
};

export const Knob = (props: KnobProps) => {
  const propsWithDefaults = mergeProps(
    {
      value: 0,
      min: 0,
      max: 10,
      step: 0,
      speed: 1,
      logarithmic: false,
      initialRotation: 0,
    },
    props
  );

  const rotation = createMemo(
    () =>
      ((propsWithDefaults.value /
        (propsWithDefaults.max - propsWithDefaults.min)) *
        300 +
        (propsWithDefaults.initialRotation ?? 0)) %
      360
  );

  const range = createMemo(() => propsWithDefaults.max - propsWithDefaults.min);

  const [isDragging, setIsDragging] = createSignal(false);
  const [lastPosition, setLastPosition] = createSignal({ x: 0, y: 0 });
  const [internalValue, setInternalValue] = createSignal(
    untrack(() => propsWithDefaults.value)
  );

  const handleChange = (percentIncrement: number, fine: boolean) => {
    const multiplicator = fine ? 0.1 : 1;
    const step = multiplicator * propsWithDefaults.step;
    const speed = multiplicator * propsWithDefaults.speed;

    const newValue = internalValue() + percentIncrement * speed * range();

    const roundedValue =
      step > 0 ? Math.round(newValue / step) * step : newValue;

    const clampedValue = Math.max(
      propsWithDefaults.min,
      Math.min(propsWithDefaults.max, roundedValue)
    );

    setInternalValue(roundedValue);

    if (clampedValue !== props.value) {
      props.onChange(clampedValue);
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    const currentPosition = { x: event.x, y: event.y };
    const delta = {
      x: lastPosition().x - currentPosition.x,
      y: lastPosition().y - currentPosition.y,
    };
    handleChange(
      delta.y / window.innerHeight,
      !props.fineIsDefault && event.altKey
    );
    setLastPosition(currentPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  createEffect(() => {
    if (isDragging()) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  });

  return (
    <Dynamic
      onWheel={(event: WheelEvent) => {
        event.preventDefault();
        handleChange(
          event.deltaY / window.screen.height / 5,
          !props.fineIsDefault && event.altKey
        );
      }}
      onMouseDown={(event: MouseEvent) => {
        event.preventDefault();
        setLastPosition({ x: event.x, y: event.y });
        setIsDragging(true);
      }}
      rotation={rotation()}
      component={props.component}
    />
  );
};

export const NumberInputWithLabel = (
  allProps: ComponentProps<typeof NumberInputWithArrowButtons> & {
    label?: JSXElement;
  }
) => {
  const [props, inputProps] = splitProps(allProps, ['label']);

  return (
    <div
      class={css`
        display: flex;
        align-items: center;
      `}
    >
      <LCDLabel>{props.label}</LCDLabel>
      <NumberInputWithArrowButtons {...inputProps} />
    </div>
  );
};

const MoogKnob = (
  props: Omit<KnobProps, 'component'> & {
    size?: number;
  }
) => {
  const theme = useAppTheme();
  const [ownProps, knobProps] = splitProps(props, ['size']);

  const size = createMemo(() => ownProps.size ?? theme.sizes.knobSize);

  return (
    <Knob
      {...knobProps}
      initialRotation={30}
      component={(props: { rotation: number }) => (
        <div
          style={{
            position: 'relative',
            padding: '10px',
            width: size(),
            height: size(),
          }}
        >
          <div style={{ position: 'relative' }}>
            <img
              {...props}
              src={MoogKnobSvg}
              width={size()}
              class={css`
                width: ${size()}px;
                height: ${size()}px;
                display: block;
                margin: 0 auto;
              `}
              style={{
                transform: `rotate(${props.rotation}deg)`,
                margin: 0,
                width: '100%',
                height: '100%',
              }}
            />
            <div
              class={css`
                position: absolute;
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                pointer-events: none;
                order: 1px outset #555;
                border-radius: 100%;
                box-shadow: 4px 4px 8px 4px rgba(0, 0, 0, 0.4);
              `}
            ></div>
            <div
              class={css`
                position: absolute;
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                pointer-events: none;
              `}
            >
              <div
                class={css`
                  background: conic-gradient(
                    from 16deg at 50% 50%,
                    rgba(189, 189, 189, 1) 0%,
                    rgba(255, 255, 255, 0.71) 24%,
                    rgba(189, 189, 189, 1) 49%,
                    rgba(255, 255, 255, 0.6) 75%,
                    rgba(191, 191, 191, 1) 100%
                  );
                  //background-image: conic-gradient(#eee, #ddd, #aaa, #eee, #ddd, #aaa, #eee);
                  z-index: 999;
                  //width: 48px;
                  //height: 48px;
                  width: 55%;
                  height: 55%;
                  border-radius: 100%;
                  pointer-events: none;
                  border: 1px inset #eee;
                  box-shadow: 2px 1px 8px 3px rgba(0, 0, 0, 0.2);
                `}
              />
            </div>
          </div>
        </div>
      )}
    />
  );
};

export const MoogKnobWithLabel = (
  props: Omit<KnobProps, 'component'> & {
    label?: JSXElement;
    size?: number;
  }
) => {
  const theme = useAppTheme();
  const [ownProps, knobProps] = splitProps(props, ['size', 'label']);

  const size = createMemo(() => ownProps.size ?? theme.sizes.knobSize);

  return (
    <div
      class={css`
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        vertical-align: top;
        margin: ${theme.sizes.controlMargin}px;
      `}
    >
      <Label label={props.label} />
      <div
        class={css`
          background-size: ${size()}px ${size()}px;
          background-repeat: no-repeat;
          width: ${size()}px;
          height: ${size()}px;
          min-width: ${size()}px;
          min-height: ${size()}px;
          max-width: ${size()}px;
          max-height: ${size()}px;
        `}
      >
        <MoogKnob {...knobProps} size={size()} />
      </div>
      {/*
      <input
        type="number"
        value={props.value}
        min={props.min ?? 0}
        max={props.max ?? 10}
        step={props.step}
        onInput={(event) => {
          knobProps.onChange(+event.currentTarget.value);
        }}
        class={css`
          display: block;
          background: ${theme.colors.lcdBackground};
          color: ${theme.colors.lcdText};
          border: ${size() / 50}px ${theme.colors.lcdBorder} solid;
          border-radius: ${theme.sizes.labelBorderRadius};
          text-align: center;
          width: ${size()}px;
          font-size: ${size() / 5}px;
          font-family: ${theme.fonts.lcdFont};
        `}
      />
      */}
    </div>
  );
};
