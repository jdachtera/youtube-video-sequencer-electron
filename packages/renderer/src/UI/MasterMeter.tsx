import { css } from '@emotion/css';
import { onCleanup, onMount } from 'solid-js';
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
  /* Animated via transform (scaleX), which is GPU-composited — no layout, no
     paint. See the tick loop below: it writes this transform DIRECTLY on the
     element (not through a Solid signal), so a busy meter does zero reactive /
     Commit work. */
  transition: transform 0.08s linear;
  will-change: transform;
`;

const clipLight = css`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #511;
  transition: background 0.1s, box-shadow 0.1s;
`;

// A compact master output meter with a clip light. It runs on its own rAF, but
// deliberately does NOT use Solid signals: reading the analyser 20x/sec and
// re-rendering through the reactive system (a Commit per frame) was ~40% of CPU
// on a busy mix. Instead it writes the fill transform straight onto the element
// via a ref, so the only per-frame work is reading the meter + one style write.
export const MasterMeter = (props: { engine: Engine }) => {
  let fillRef: HTMLDivElement | undefined;
  let clipRef: HTMLDivElement | undefined;

  let frame = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let clipUntil = 0;
  let lastTick = 0;
  let lastActive = 0;
  let lastLevel = -1;
  let lastClipping = false;
  // Track playback from start/stop events instead of reading transport.state in
  // the hot loop — Tone's .state getter does a Clock/Timeline lookup
  // (getStateAtTime -> forEachBetween) that showed up as a real cost at 20 fps.
  let playing = false;

  const schedule = () => {
    frame = requestAnimationFrame(tick);
  };

  const tick = (now: number) => {
    // Read + write at ~12 fps — plenty for a level meter, and keeps the
    // per-frame analyser read + style write off the critical path.
    if (now - lastTick >= 80) {
      lastTick = now;

      const value = props.engine.meter.getValue();
      const normalized = Array.isArray(value) ? Math.max(...value) : value;
      const next = Math.max(0, Math.min(1, normalized || 0));
      // Write directly to the DOM (no signal -> no Solid Commit), and only when
      // the level moved a visible amount (>=1% of the 90px track).
      if (fillRef && Math.abs(next - lastLevel) > 0.01) {
        lastLevel = next;
        fillRef.style.transform = `scaleX(${next})`;
      }

      if (props.engine.limiter.reduction < -0.3) clipUntil = now + 600;
      const isClipping = now < clipUntil;
      if (clipRef && isClipping !== lastClipping) {
        lastClipping = isClipping;
        clipRef.style.background = isClipping ? '#ff3b30' : '#511';
        clipRef.style.boxShadow = isClipping ? '0 0 6px 1px #ff3b30' : 'none';
      }
    }

    // Keep animating while there's signal / playback / a recent clip; otherwise
    // drop to a 5 fps poll so the renderer can idle. Wakes back within ~200 ms.
    const busy = lastLevel > 0.005 || now < clipUntil || playing;
    if (busy) lastActive = now;

    if (now - lastActive > 400) {
      idleTimer = setTimeout(schedule, 200);
    } else {
      schedule();
    }
  };

  const onStart = () => {
    playing = true;
    lastActive = performance.now();
  };
  const onStop = () => {
    playing = false;
  };

  onMount(() => {
    props.engine.on('start', onStart);
    props.engine.on('stop', onStop);
    schedule();
  });
  onCleanup(() => {
    props.engine.off('start', onStart);
    props.engine.off('stop', onStop);
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
        <div
          ref={fillRef}
          class={meterFill}
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
      <div ref={clipRef} class={clipLight} title="Clip / limiter active" />
    </div>
  );
};
