import { css } from '@emotion/css';
import { createSignal, onCleanup, onMount } from 'solid-js';
import type { Engine } from '../engine/Engine';

const meterTrack = css`
  position: relative;
  width: 90px;
  height: 10px;
  border-radius: 3px;
  background: #2a2a2a;
  box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.6);
  overflow: hidden;
`;

const meterFill = css`
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(
    90deg,
    #4caf50 0%,
    #8bc34a 60%,
    #ffc107 80%,
    #ff5252 100%
  );
  /* Animate the fill with transform (scaleX), NOT width. width changes force a
     layout + paint on every frame (profiled at ~45% of total CPU); transform is
     composited on the GPU, so updating it 20x/sec is nearly free. */
  transition: transform 0.08s linear;
  will-change: transform;
`;

const clipLight = css`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  transition: background 0.1s, box-shadow 0.1s;
`;

// A compact master output meter with a clip light. Reads the engine's
// post-limiter level (0..1) and the limiter's gain reduction on its own
// animation frame, so it updates whether or not the transport is running.
export const MasterMeter = (props: { engine: Engine }) => {
  const [level, setLevel] = createSignal(0);
  const [clipping, setClipping] = createSignal(false);

  let frame = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let clipUntil = 0;
  let lastTick = 0;
  let lastActive = 0;

  const schedule = () => {
    frame = requestAnimationFrame(tick);
  };

  const tick = (now: number) => {
    // Read the analyser + touch the DOM at ~20 fps. Reading getValue() and
    // committing a style is the expensive part, and a level meter doesn't need
    // more than this.
    if (now - lastTick >= 50) {
      lastTick = now;
      const value = props.engine.meter.getValue();
      const normalized = Array.isArray(value) ? Math.max(...value) : value;
      const next = Math.max(0, Math.min(1, normalized || 0));
      // Only commit visible changes (>=1% of the 90px track) so a jittering
      // noise floor doesn't repaint when nothing perceptibly moved.
      if (Math.abs(next - level()) > 0.01) setLevel(next);
      if (props.engine.limiter.reduction < -0.3) clipUntil = now + 600;
      const isClipping = now < clipUntil;
      if (isClipping !== clipping()) setClipping(isClipping);
    }

    // When there's signal, the transport is running, or we just clipped, keep
    // animating. Otherwise the meter is a static "0" — a constant rAF would keep
    // the whole renderer/compositor awake for nothing, so drop to a 5 fps poll.
    // Any audio activity wakes it back to full rate within ~200 ms.
    const busy =
      level() > 0.005 ||
      now < clipUntil ||
      props.engine.transport.state === 'started';
    if (busy) lastActive = now;

    if (now - lastActive > 400) {
      idleTimer = setTimeout(schedule, 200);
    } else {
      schedule();
    }
  };

  onMount(() => schedule());
  onCleanup(() => {
    cancelAnimationFrame(frame);
    if (idleTimer) clearTimeout(idleTimer);
  });

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
      <div class={meterTrack}>
        <div class={meterFill} style={{ transform: `scaleX(${level()})` }} />
      </div>
      <div
        class={clipLight}
        style={{
          background: clipping() ? '#ff3b30' : '#511',
          'box-shadow': clipping() ? '0 0 6px 1px #ff3b30' : 'none',
        }}
        title="Clip / limiter active"
      />
    </div>
  );
};
