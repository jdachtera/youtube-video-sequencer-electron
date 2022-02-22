import { ComponentProps, createMemo, splitProps } from 'solid-js';
import { InputWithArrowButtons } from './InputWithArrowButtons';

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
      onWheel={(event) => {
        if (event.deltaY > 0) {
          event.preventDefault();
          handleUp();
        } else if (event.deltaY < 0) {
          event.preventDefault();
          handleDown();
        }
      }}
    />
  );
};
