import { css } from '@emotion/css';
import { createSignal, onCleanup, onMount } from 'solid-js';
import type { Engine } from '../engine/Engine';

// A compact master output meter with a clip light. Reads the engine's
// post-limiter level (0..1) and the limiter's gain reduction on its own
// animation frame, so it updates whether or not the transport is running.
export const MasterMeter = (props: { engine: Engine }) => {
  const [level, setLevel] = createSignal(0);
  const [clipping, setClipping] = createSignal(false);

  let frame = 0;
  let clipUntil = 0;

  const tick = () => {
    const value = props.engine.meter.getValue();
    const normalized = Array.isArray(value) ? Math.max(...value) : value;
    setLevel(Math.max(0, Math.min(1, normalized || 0)));

    // The limiter reports negative dB while it's catching peaks. Latch the clip
    // light briefly so a momentary catch is still visible.
    const now = performance.now();
    if (props.engine.limiter.reduction < -0.3) clipUntil = now + 600;
    setClipping(now < clipUntil);

    frame = requestAnimationFrame(tick);
  };

  onMount(() => {
    frame = requestAnimationFrame(tick);
  });
  onCleanup(() => cancelAnimationFrame(frame));

  return (
    <div
      class={css`
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: 'oswald';
        color: #cfcfcf;
        font-size: 11px;
      `}
      title="Master output level"
    >
      <div
        class={css`
          position: relative;
          width: 90px;
          height: 10px;
          border-radius: 3px;
          background: #2a2a2a;
          box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.6);
          overflow: hidden;
        `}
      >
        <div
          class={css`
            position: absolute;
            inset: 0 auto 0 0;
            width: ${Math.round(level() * 100)}%;
            background: linear-gradient(
              90deg,
              #4caf50 0%,
              #8bc34a 60%,
              #ffc107 80%,
              #ff5252 100%
            );
            transition: width 0.05s linear;
          `}
        />
      </div>
      <div
        class={css`
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: ${clipping() ? '#ff3b30' : '#511'};
          box-shadow: ${clipping() ? '0 0 6px 1px #ff3b30' : 'none'};
          transition: background 0.1s, box-shadow 0.1s;
        `}
        title="Clip / limiter active"
      />
    </div>
  );
};
