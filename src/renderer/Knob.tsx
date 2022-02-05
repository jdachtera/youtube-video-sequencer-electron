import {
  createEffect,
  createMemo,
  createSignal,
  JSX,
  JSXElement,
  mergeProps,
  splitProps,
  untrack,
} from 'solid-js';
import MoogKnobSvg from './moog_knob.svg';
import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import { css } from 'solid-styled-components';
import { useAppTheme } from './theme';
import { Label } from './Label';

type KnobProps = {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  speed?: number;
  fineIsDefault?: boolean;
  initialRotation?: number;
  onChange: (newValue: number) => void;
  style?: JSX.CSSProperties;
} & Omit<JSX.IntrinsicElements['img'], 'style' | 'onChange'>;

export const Knob = (props: KnobProps) => {
  const [ownProps, imageProps] = splitProps(props, [
    'value',
    'min',
    'max',
    'step',
    'speed',
    'onChange',
    'style',
    'initialRotation',
  ]);

  const propsWithDefaults = mergeProps(
    {
      value: 0,
      min: 0,
      max: 10,
      step: 0,
      speed: 1,
      initialRotation: 0,
    },
    ownProps
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
    <div style={{position: 'relative'}}>
      <img
        {...imageProps}
        onWheel={(event) => {
          event.preventDefault();
          handleChange(
            event.deltaY / window.screen.height / 5,
            !props.fineIsDefault && event.altKey
          );
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          setLastPosition({ x: event.x, y: event.y });
          setIsDragging(true);
        }}
        style={{
          ...props.style,
          transform: `rotate(${rotation()}deg)`,
          margin: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <div class={css`
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
      `}>
        <div class={css`
          background:conic-gradient(
            from 16deg at 50% 50%,
            rgba(189, 189, 189, 1) 0%,
            rgba(255, 255, 255, 0.71) 24%,
            rgba(189, 189, 189, 1) 49%,
            rgba(255, 255, 255, 0.6) 75%,
            rgba(191, 191, 191, 1) 100%);
          //background-image: conic-gradient(#eee, #ddd, #aaa, #eee, #ddd, #aaa, #eee);
          z-index: 999;
          //width: 48px;
          //height: 48px;
          width: 55%;
          height: 55%;
          border-radius: 100%;
          pointer-events: none;
          border: 1px inset white;
          box-shadow: 2px 1px 8px 3px rgba(0,0,0,0.2);
          `}/>
      </div>
    </div>
  );
};

export const MoogKnobWithLabel = (
  props: Omit<KnobProps, 'src' | 'initialRotation'> & {
    label?: JSXElement;
    size?: number;
  }
) => {
  const theme = useAppTheme();
  const mergedProps = mergeProps(
    {
      src: MoogKnobSvg,
      initialRotation: 30,
      size: theme.sizes.knobSize,
    },
    props
  );

  return (
    <div
      class={css`
        display: inline-block;
        vertical-align: top;
        margin: ${theme.sizes.controlMargin}px;
      `}
    >
      <Label label={props.label} />
      <div
        class={css`
          background-size: ${mergedProps.size}px ${mergedProps.size}px;
          /* background-image: url(${ScrewHeadWithHole}); */
          background-repeat: no-repeat;
          width:  ${mergedProps.size}px;
          height: ${mergedProps.size}px;
        `}
      >
        <Knob
          {...mergedProps}
          class={css`
            width: ${mergedProps.size}px;
            height: ${mergedProps.size}px;
            display: block;
            margin: 0 auto;
          `}
        />
      </div>
      <input
        type="number"
        value={props.value}
        min={props.min ?? 0}
        max={props.max ?? 10}
        step={props.step}
        onInput={(event) => {
          mergedProps.onChange(+event.currentTarget.value);
        }}
        class={css`
          display: block;
          background: ${theme.colors.lcdBackground};
          color: ${theme.colors.lcdText};
          border: ${mergedProps.size / 50}px ${theme.colors.lcdBorder} solid;
          border-radius: ${theme.sizes.labelBorderRadius};
          text-align: center;
          width: ${mergedProps.size}px;
          font-size: ${mergedProps.size / 5}px;
        `}
      />
    </div>
  );
};
