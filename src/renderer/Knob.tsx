import {
  createEffect,
  createMemo,
  createSignal,
  JSX,
  JSXElement,
  mergeProps,
  splitProps,
} from 'solid-js';
import MoogKnobSvg from './knob.svg';
import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import { css } from 'solid-styled-components';
import { useAppTheme } from './theme';

type KnobProps = {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  speed?: number;
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

  const handleChange = (value: number) => {
    const clampedValue = Math.max(
      propsWithDefaults.min,
      Math.min(propsWithDefaults.max, value)
    );
    const newValue =
      propsWithDefaults.step > 0
        ? Math.round(clampedValue / propsWithDefaults.step) *
          propsWithDefaults.step
        : clampedValue;
    props.onChange(newValue);
  };

  const handleMouseMove = (event: MouseEvent) => {
    const currentPosition = { x: event.x, y: event.y };
    const delta = {
      x: lastPosition().x - currentPosition.x,
      y: lastPosition().y - currentPosition.y,
    };
    const speed = (event.altKey ? 0.1 : 1) * propsWithDefaults.speed;
    handleChange(
      propsWithDefaults.value + (delta.y / window.innerHeight) * speed * range()
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
    <img
      {...imageProps}
      onWheel={(event) => {
        event.preventDefault();
        const speed = (event.altKey ? 0.1 : 1) * propsWithDefaults.speed;
        handleChange(
          propsWithDefaults.value +
            (event.deltaY / window.screen.height / 5) * speed * range()
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
      }}
    />
  );
};

export const MoogKnobWithLabel = (
  props: Omit<KnobProps, 'src' | 'initialRotation'> & { label?: JSXElement }
) => {
  const theme = useAppTheme();
  const mergedProps = mergeProps(props, {
    src: MoogKnobSvg,
    initialRotation: 280,
  });
  return (
    <div
      class={css`
        display: inline-block;
      `}
    >
      <label
        class={css`
          display: block;
          background: ${theme.colors.lcdBackground};
          color: ${theme.colors.lcdText};
          border: ${theme.sizes.knobSize / 50}px ${theme.colors.lcdBorder} solid;
          border-radius: ${theme.sizes.labelBorderRadius};
          text-align: center;
          font-size: ${theme.sizes.knobSize / 5}px;
        `}
      >
        {props.label}
      </label>
      <div
        class={css`
          background-size: ${theme.sizes.knobSize}px ${theme.sizes.knobSize}px;
          background-image: url(${ScrewHeadWithHole});
          background-repeat: no-repeat;
        `}
      >
        <Knob
          {...mergedProps}
          class={css`
            width: ${theme.sizes.knobSize}px;
            display: block;
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
          border: ${theme.sizes.knobSize / 50}px ${theme.colors.lcdBorder} solid;
          border-radius: ${theme.sizes.labelBorderRadius};
          text-align: center;
          width: ${theme.sizes.knobSize}px;
          font-size: ${theme.sizes.knobSize / 5}px;
        `}
      />
    </div>
  );
};
