import { JSX, mergeProps, splitProps } from 'solid-js';

import SwitchOnSvg from './switch--on.svg';
import SwitchOffSvg from './switch--off.svg';
import { css } from 'solid-styled-components';
import { Label } from './Label';
import { useAppTheme } from './theme';

export const Toggle = (
  props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    size?: number;
    checkedImage?: string;
    uncheckedImage?: string;
  } & Omit<JSX.IntrinsicElements['img'], 'onChange'>
) => {
  const theme = useAppTheme();

  const [ownProps, imageProps] = splitProps(props, ['checked', 'onChange']);
  const propsWithDefaults = mergeProps(
    {
      size: theme.sizes.toggleSize,
      checkedImage: SwitchOnSvg,
      uncheckedImage: SwitchOffSvg,
    },
    ownProps
  );

  return (
    <div
      class={css`
        display: inline-block;
      `}
    >
      <Label label={props.label} />
      <img
        {...imageProps}
        src={
          ownProps.checked
            ? propsWithDefaults.checkedImage
            : propsWithDefaults.uncheckedImage
        }
        onClick={() => {
          props.onChange(!props.checked);
        }}
        class={[
          css`
            display: block;
            height: ${propsWithDefaults.size}px;
          `,
          props.class ?? '',
        ].join(' ')}
      />
    </div>
  );
};
