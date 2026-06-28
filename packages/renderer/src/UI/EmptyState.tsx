import { css } from '@emotion/css';
import { For } from 'solid-js';
import type { Engine } from '../engine/Engine';

const steps = [
  {
    n: '1',
    title: 'Find a sound',
    body: 'Search YouTube in the Browser and add any track as a sample — drums, a vocal, a whole song.',
  },
  {
    n: '2',
    title: 'Build a library',
    body: 'Drag across the waveform to set the region, or Chop a sample into many slots. They line up in the sampler as your own slice library.',
  },
  {
    n: '3',
    title: 'Sequence & play',
    body: 'Double-click a sample to drop it on a track, program the step grid or piano roll, add effects, then hit play.',
  },
];

export const EmptyState = (props: { engine: Engine }) => {
  const openBrowser = () => {
    props.engine.set({
      viewMode: { sidePanel: { open: true, activeTab: 'YouTube' } },
    });
  };

  return (
    <div
      class={css`
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        font-family: 'oswald';
        color: #e8e8e8;
        user-select: none;
      `}
    >
      <div
        class={css`
          max-width: 720px;
          text-align: center;
        `}
      >
        <div
          class={css`
            font-size: 13px;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: #ff9100;
            margin-bottom: 6px;
          `}
        >
          MegaRack
        </div>
        <h1
          class={css`
            font-size: 40px;
            font-weight: 700;
            margin: 0 0 10px;
            color: #fff;
          `}
        >
          Build a beat from anything on YouTube
        </h1>
        <p
          class={css`
            font-size: 16px;
            line-height: 1.5;
            color: #bdbdbd;
            margin: 0 auto 32px;
            max-width: 520px;
          `}
        >
          Sample any video, chop it into slices, and sequence them into your own
          track — all in one rack.
        </p>

        <div
          class={css`
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
            @media (max-width: 720px) {
              grid-template-columns: 1fr;
            }
          `}
        >
          <For each={steps}>
            {(step) => (
              <div
                class={css`
                  background: rgba(255, 255, 255, 0.04);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  border-radius: 10px;
                  padding: 18px 16px;
                  text-align: left;
                `}
              >
                <div
                  class={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #ff9100;
                    color: #1a1a1a;
                    font-weight: 700;
                    font-size: 15px;
                    margin-bottom: 12px;
                  `}
                >
                  {step.n}
                </div>
                <div
                  class={css`
                    font-size: 17px;
                    font-weight: 600;
                    color: #fff;
                    margin-bottom: 6px;
                  `}
                >
                  {step.title}
                </div>
                <div
                  class={css`
                    font-size: 13.5px;
                    line-height: 1.45;
                    color: #b0b0b0;
                  `}
                >
                  {step.body}
                </div>
              </div>
            )}
          </For>
        </div>

        <button
          type="button"
          onClick={openBrowser}
          class={css`
            cursor: pointer;
            font-family: 'oswald';
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
            color: #1a1a1a;
            background: linear-gradient(180deg, #ffb347, #ff9100);
            border: none;
            border-radius: 8px;
            padding: 12px 28px;
            box-shadow: 0 2px 8px rgba(255, 145, 0, 0.35);
            transition: transform 0.08s ease, box-shadow 0.12s ease;
            &:hover {
              box-shadow: 0 4px 14px rgba(255, 145, 0, 0.5);
            }
            &:active {
              transform: translateY(1px);
            }
          `}
        >
          Browse sounds →
        </button>
      </div>
    </div>
  );
};
