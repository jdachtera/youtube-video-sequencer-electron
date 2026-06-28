import { css } from '@emotion/css';
import type { ComponentProps, JSX, JSXElement } from 'solid-js';
import {
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
  untrack,
} from 'solid-js';
import { LCDLabel } from '../UI/LCD';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import MoogKnobSvg from '../svg/moog_knob.svg';
import { Label } from './Label';
import { useAppTheme } from './theme';

type KnobProps = {
  image: string;
  size: number;
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
    props,
  );

  const rotation = createMemo(
    () =>
      ((propsWithDefaults.value /
        (propsWithDefaults.max - propsWithDefaults.min)) *
        300 +
        (propsWithDefaults.initialRotation ?? 0)) %
      360,
  );

  const range = createMemo(() => propsWithDefaults.max - propsWithDefaults.min);

  const [isDragging, setIsDragging] = createSignal(false);
  const [lastPosition, setLastPosition] = createSignal({ x: 0, y: 0 });
  const [internalValue, setInternalValue] = createSignal(
    untrack(() => propsWithDefaults.value),
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
      Math.min(propsWithDefaults.max, roundedValue),
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
      !props.fineIsDefault && event.altKey,
    );
    setLastPosition(currentPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  createEffect(() => {
    if (!isDragging()) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    // Drop the window listeners when the drag ends (effect re-runs) or the knob
    // unmounts mid-drag — onCleanup covers both, so they can't leak.
    onCleanup(() => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    });
  });

  return (
    <div
      onWheel={(event: WheelEvent) => {
        event.preventDefault();
        handleChange(
          event.deltaY / window.screen.height / 5,
          !props.fineIsDefault && event.altKey,
        );
      }}
      onMouseDown={(event: MouseEvent) => {
        event.preventDefault();

        setLastPosition({ x: event.x, y: event.y });
        setIsDragging(true);
      }}
      style={{
        position: 'relative',
        padding: '10px',
        width: `${props.size}px`,
        height: `${props.size}px`,
      }}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={props.image}
          width={props.size}
          class={css`
            width: ${props.size}px;
            height: ${props.size}px;
            display: block;
            margin: 0 auto;
          `}
          style={{
            transform: `rotate(${rotation()}deg)`,
            margin: '0',
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
              /* Sits above the knob image (an earlier sibling). Keep it low: the
                 knob's container isn't a stacking context, so a high z-index would
                 leak out and cover menus/popovers (e.g. the z-index 20 "Add
                 effect" popover over a device's knobs). */
              z-index: 1;
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
  );
};

export const NumberInputWithLabel = (
  allProps: ComponentProps<typeof NumberInputWithArrowButtons> & {
    label?: JSXElement;
  },
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
  },
) => {
  const theme = useAppTheme();
  const [ownProps, knobProps] = splitProps(props, ['size']);

  const size = createMemo(() => ownProps.size ?? theme.sizes.knobSize);

  return (
    <Knob
      {...knobProps}
      size={size()}
      image={MoogKnobSvg}
      initialRotation={30}
    />
  );
};

// Default numeric formatting for the value readout: fewer decimals as the
// magnitude grows, so a 12000 Hz cutoff and a 0.25 ratio both read cleanly.
const formatKnobValue = (value: number): string => {
  if (!Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value);
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

export const MoogKnobWithLabel = (
  props: Omit<KnobProps, 'image' | 'size'> & {
    label?: JSXElement;
    size?: number;
    // Optional unit shown after the value (e.g. 'Hz', 's', 'dB').
    unit?: string;
    // Optional custom formatter for the value readout.
    format?: (value: number) => string;
  },
) => {
  const theme = useAppTheme();
  const [ownProps, knobProps] = splitProps(props, [
    'size',
    'label',
    'unit',
    'format',
  ]);

  const size = createMemo(() => ownProps.size ?? theme.sizes.knobSize);

  const formatted = () =>
    (ownProps.format ?? formatKnobValue)(props.value ?? 0);
  const display = () =>
    ownProps.unit ? `${formatted()} ${ownProps.unit}` : formatted();

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
        <MoogKnob {...knobProps} image={MoogKnobSvg} size={size()} />
      </div>
      {/* Current value readout. */}
      <div
        title={`${props.label ?? ''}: ${display()} (${formatKnobValue(
          props.min ?? 0,
        )} – ${formatKnobValue(props.max ?? 10)})`}
        class={css`
          background: ${theme.colors.lcdBackground};
          color: ${theme.colors.lcdText};
          font-family: ${theme.fonts.lcdFont};
          font-size: ${Math.max(9, size() / 5)}px;
          line-height: 1.2;
          text-align: center;
          border-radius: ${theme.sizes.labelBorderRadius};
          padding: 0 4px;
          min-width: ${size()}px;
          box-sizing: border-box;
          white-space: nowrap;
        `}
      >
        {display()}
      </div>
      {/* Min/max scale hints. */}
      <div
        class={css`
          display: flex;
          justify-content: space-between;
          width: ${size()}px;
          font-size: ${Math.max(7, size() / 7)}px;
          opacity: 0.6;
          color: ${theme.colors.lcdText};
          font-family: ${theme.fonts.lcdFont};
        `}
      >
        <span>{formatKnobValue(props.min ?? 0)}</span>
        <span>{formatKnobValue(props.max ?? 10)}</span>
      </div>
    </div>
  );
};
