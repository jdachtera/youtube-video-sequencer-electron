import { splitProps, JSX } from 'solid-js';
import { css } from 'renderer/emotion-solid';
import { ButtonWithLabel } from './ButtonWithLabel';

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
