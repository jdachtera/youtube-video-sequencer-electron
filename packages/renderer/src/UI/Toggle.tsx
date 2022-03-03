import type { JSX } from 'solid-js';
import { mergeProps, splitProps } from 'solid-js';

import SwitchOnSvg from '../svg/switch--on.svg';
import SwitchOffSvg from '../svg/switch--off.svg';
import { css } from '@emotion/css';
import { Label } from './Label';
import { useAppTheme } from './theme';

export const Toggle = (
  props: {
    checked: boolean;
    onChange: (checked: boolean, altKey: boolean) => void;
    label?: string;
    size?: number;
    checkedImage?: string;
    uncheckedImage?: string;
  } & Omit<JSX.IntrinsicElements['img'], 'onChange'>,
) => {
  const theme = useAppTheme();

  const [ownProps, imageProps] = splitProps(props, ['checked', 'onChange']);
  const propsWithDefaults = mergeProps(
    {
      size: theme.sizes.toggleSize,
      checkedImage: SwitchOnSvg,
      uncheckedImage: SwitchOffSvg,
    },
    ownProps,
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
      <img
        {...imageProps}
        src={
          ownProps.checked
            ? propsWithDefaults.checkedImage
            : propsWithDefaults.uncheckedImage
        }
        onClick={(event) => {
          props.onChange(!props.checked, event.altKey);
        }}
        class={[
          css`
            display: block;
            height: ${propsWithDefaults.size}px;
            margin: 0 auto;
          `,
          props.class ?? '',
        ].join(' ')}
      />
    </div>
  );
};
