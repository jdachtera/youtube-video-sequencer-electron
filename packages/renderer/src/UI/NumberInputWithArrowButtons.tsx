import type { ComponentProps } from 'solid-js';
import { splitProps, createSignal, mergeProps } from 'solid-js';
import { isNumber } from 'tone';
import { InputWithArrowButtons } from './InputWithArrowButtons';

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
  >,
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
    propsWithoutDefaults,
  );

  const [cursorPosition, setCursorPosition] = createSignal<number | null>(0);

  const step = () =>
    isNumber(props.step) ? props.step : props.step(cursorPosition());

  const triggerChange = (value: number) =>
    props.onChange?.(Math.min(Math.max(props.min, value), props.max));

  const handleUp = () => triggerChange(props.value + step());
  const handleDown = () => triggerChange(props.value - step());

  // Click-and-drag scrubbing: drag up/down on the readout to change the value
  // (Alt for fine steps). A plain click without moving still focuses the input
  // for typing.
  let scrubStartY = 0;
  let scrubStartValue = 0;
  let scrubbing = false;

  const onScrubMove = (event: MouseEvent) => {
    const deltaY = scrubStartY - event.clientY;
    if (!scrubbing && Math.abs(deltaY) < 3) return;
    scrubbing = true;
    event.preventDefault();
    const fine = event.altKey ? 0.25 : 1;
    const increment = Math.round(deltaY / 4) * step() * fine;
    triggerChange(scrubStartValue + increment);
  };

  const onScrubEnd = () => {
    scrubbing = false;
    window.removeEventListener('mousemove', onScrubMove);
    window.removeEventListener('mouseup', onScrubEnd);
  };

  const onScrubStart = (event: MouseEvent) => {
    if (event.button !== 0 || allProps.disabled) return;
    scrubStartY = event.clientY;
    scrubStartValue = props.value;
    scrubbing = false;
    window.addEventListener('mousemove', onScrubMove);
    window.addEventListener('mouseup', onScrubEnd);
  };

  return (
    <InputWithArrowButtons
      {...inputProps}
      value={props.format(props.value)}
      title="Drag up/down to change · Alt for fine"
      onMouseDown={onScrubStart}
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
      onWheel={(event) => {
        event.preventDefault();
        setCursorPosition(event.currentTarget.selectionStart);
        if (event.deltaY > 0) {
          handleUp();
        } else if (event.deltaY < 0) {
          handleDown();
        }
        event.currentTarget.selectionStart = cursorPosition();
        event.currentTarget.selectionEnd = cursorPosition();
      }}
    />
  );
};
