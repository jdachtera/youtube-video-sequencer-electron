import type { JSXElement, JSX } from 'solid-js';
import { splitProps, mergeProps, createSignal, createMemo } from 'solid-js';

export const RangeInput = (
  allProps: {
    label?: JSXElement;
    value: number;
    onChange: (value: number) => void;
    formatValue?: (value: number) => string | number;
    step?: number;
    fineStep?: number;
    min?: number;
    max?: number;
  } & Omit<JSX.IntrinsicElements['div'], 'onChange'>,
) => {
  const propsWithDefaults = mergeProps(
    {
      formatValue: (value: number) => value.toString(),
      step: 1,
      fineStep: 1,
    },
    allProps,
  );

  const [inputProps, props, divProps] = splitProps(
    propsWithDefaults,
    ['min', 'max'],
    ['label', 'formatValue', 'value', 'onChange', 'step', 'fineStep'],
  );

  const [altKeyDown, setAltKeyDown] = createSignal(false);

  const step = createMemo(() => (altKeyDown() ? props.fineStep : props.step));

  return (
    <div {...divProps}>
      <label>{props.label}</label>
      <div>{props.formatValue(props.value)}</div>

      <input
        {...inputProps}
        type="range"
        step={step()}
        value={props.value}
        onMouseDown={(event) => setAltKeyDown(event.altKey)}
        onMouseMove={(event) => setAltKeyDown(event.altKey)}
        onInput={(event) => props.onChange(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
};
