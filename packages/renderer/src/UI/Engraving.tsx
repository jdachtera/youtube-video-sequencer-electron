import { css } from '@emotion/css';
import type { PropsWithChildren } from 'solid-js';
import ScrewHead from '../svg/screw_head.svg';

export const Engraving = (props: PropsWithChildren<{ class?: string }>) => {
  return (
    <div
      class={[
        css`
          box-shadow: 0 0 1px 1px #585858;
          border-radius: 100%;
          /* margin: 4px; */
          border: 2px inset white;
        `,
        props.class,
      ].join(' ')}
    >
      {props.children}
    </div>
  );
};

export const Screw = (props: { width?: string; class?: string }) => {
  return (
    <img
      src={ScrewHead}
      width={props.width ?? '20px'}
      class={[
        css`
          transform: rotate(${Math.random() * 50}deg);
          display: flex;
        `,
        props.class,
      ].join(' ')}
    />
  );
};

export const ScrewRow = () => {
  return (
    <div
      class={css`
        display: inline-flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      `}
    >
      {/* {renderScrews()} */}
      <Engraving>
        <Screw />
      </Engraving>
      <Screw />
      <Screw />
    </div>
  );
};

export const PlasticButton = () => {
  return <div></div>;
};

export const ModuleFrame = (props: PropsWithChildren) => {
  return (
    <div
      class={css`
        display: flex;
        flex-direction: column;
        margin: 20px;
      `}
    >
      <ScrewRow />
      <div
        class={css`
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 10px;
          padding-left: 20px;
          padding-right: 20px;
        `}
      >
        {props.children}
      </div>
      <ScrewRow />
    </div>
  );
};
