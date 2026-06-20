import { css } from '@emotion/css';
import { Show } from 'solid-js';
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
          align-items: stretch;
          cursor: pointer;
          height: 72px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          border-left: 3px solid transparent;
          transition: background 0.1s ease, border-color 0.1s ease;
          &:hover {
            background: rgba(255, 255, 255, 0.05);
          }
        `]: true,
        [css`
          background: rgba(255, 145, 0, 0.14);
          border-left-color: #ff9100;
          &:hover {
            background: rgba(255, 145, 0, 0.18);
          }
        `]: props.isSelected,
      }}
    >
      <div
        class={css`
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 72px;
          height: 72px;
          background-color: #222;
          background-size: cover;
          background-position: 50% 50%;
          color: #555;
          font-size: 26px;
        `}
        style={
          props.thumbnail
            ? { 'background-image': `url('${props.thumbnail}')` }
            : undefined
        }
        onClick={() => props.onSelect()}
      >
        <Show when={!props.thumbnail}>♪</Show>
      </div>
      <div
        class={css`
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          padding: 6px 8px;
          font-family: 'oswald';
          font-size: 13px;
          line-height: 1.3;
          color: #e6e6e6;
        `}
        onClick={() => props.onSelect()}
        title={props.name}
      >
        <span
          class={css`
            overflow: hidden;
            word-break: break-word;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
          `}
        >
          {props.name}
        </span>
      </div>
      <div
        class={css`
          display: flex;
          align-items: center;
          padding-right: 6px;
        `}
      >
        <ButtonWithLabel
          label="+"
          labelOnButton
          onClick={() => props.onAdd()}
        />
      </div>
    </li>
  );
};
