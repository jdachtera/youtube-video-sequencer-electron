import { css } from '@emotion/css';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';

export const BrowserListItem = (props: {
  isSelected: boolean;
  thumbnail: string;
  name: string;
  onSelect: () => void;
  onAdd: () => void;
}) => {
  return (
    <li
      classList={{
        [css`
          display: flex;
          cursor: pointer;
          border-bottom: 1px black solid;
          overflow: hidden;
          height: 80px;
        `]: true,
        [css`
          background: #363434;
        `]: props.isSelected,
      }}
    >
      <div
        class={css`
          display: flex;
          width: 80px;
          height: 80px;
          background-size: cover;
          background-position: 50% 50%;
        `}
        style={{
          'background-image': `url('${props.thumbnail ?? ''}')`,
        }}
        onClick={() => props.onSelect()}
      ></div>
      <div
        class={css`
          flex: 1;
          padding: 5px;
          text-overflow: ellipsis;
          overflow: hidden;
        `}
        onClick={() => props.onSelect()}
      >
        {props.name}
      </div>
      <div>
        <ButtonWithLabel
          label="+"
          labelOnButton
          onClick={() => props.onAdd()}
        />
      </div>
    </li>
  );
};
