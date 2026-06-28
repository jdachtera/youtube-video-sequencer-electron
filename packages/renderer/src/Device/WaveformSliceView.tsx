import { css, keyframes } from '@emotion/css';
import {
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
  Show,
} from 'solid-js';
import { Waveform } from 'solid-waveform';
import { createSignalFromEventEmitter } from '../engine/EngineBase';
import type { Slice } from '../engine/device/Slice';

type WaveformSliceViewProps = {
  slice: Slice;
  center: number;
  height?: number;
  collapsed: boolean;
  onClickWaveform: (event: MouseEvent) => void;
};

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Circular progress ring geometry (around the stop button).
const RING_RADIUS = 13;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const WaveformSliceView = (
  propsWithoutDefaults: WaveformSliceViewProps,
) => {
  const props = mergeProps({ currentTime: 0 }, propsWithoutDefaults);

  const handleClickWaveform = (event: MouseEvent) =>
    props.onClickWaveform(event);

  const buffer = createSignalFromEventEmitter(
    () => props.slice,
    (slice) =>
      slice.player.buffer.length
        ? slice.player.buffer.toMono().get()
        : undefined,
    ['load', 'reverseUpdated'],
  );

  // The bound sample slot is still downloading/decoding its source.
  const loading = createSignalFromEventEmitter(
    () => props.slice,
    (slice) => slice.loading,
    ['loadingUpdated', 'load'],
  );

  // Local playback state + progress (0..1), driven by a rAF loop so we can draw
  // a progress ring and self-terminate when the audition reaches its end (a
  // Tone.Player doesn't emit a "stopped" event on natural end).
  const [playStart, setPlayStart] = createSignal<number | null>(null);
  const [progress, setProgress] = createSignal(0);

  const isPlaying = () => playStart() != null;

  const durationMs = () =>
    ((props.slice.end - props.slice.start) / props.slice.playbackRate) * 1000;

  let raf = 0;
  const tick = () => {
    const start = playStart();
    if (start == null) return;
    const total = durationMs();
    const ratio =
      total > 0 ? Math.min(1, (performance.now() - start) / total) : 1;
    setProgress(ratio);
    if (ratio >= 1) {
      // Reached the end of the slice — the audition finished on its own.
      setPlayStart(null);
      setProgress(0);
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const handlePlaying = (playing: boolean) => {
    cancelAnimationFrame(raf);
    if (playing) {
      setPlayStart(performance.now());
      setProgress(0);
      raf = requestAnimationFrame(tick);
    } else {
      setPlayStart(null);
      setProgress(0);
    }
  };

  createEffect(() => {
    props.slice.off('playingUpdated', handlePlaying);
    props.slice.on('playingUpdated', handlePlaying);
  });

  onCleanup(() => {
    props.slice.off('playingUpdated', handlePlaying);
    cancelAnimationFrame(raf);
  });

  const stopPlayback = (event: MouseEvent) => {
    // Don't let the click fall through to the waveform (which would re-trigger
    // playback).
    event.stopPropagation();
    event.preventDefault();
    props.slice.stop();
  };

  return (
    <div
      classList={{
        [css`
          min-width: 120px;
          width: 100%;
          height: ${props.height ?? 50}px;
          position: relative;
        `]: true,
      }}
    >
      <Waveform
        classList={{
          [css`
            min-width: 120px;
            width: 100%;
            height: ${props.height ?? 50}px;
          `]: true,
        }}
        buffer={buffer()}
        onClick={handleClickWaveform}
        position={0}
        zoom={1}
        scale={1}
      />
      <div
        classList={{
          [css`
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            background: black;

            height: ${props.height ?? 50}px;
            width: 1px;
          `]: true,
          [css`
            animation: ${keyframes`
               0% {
                 left: 0px;
               }
               100% {
                 left: 100%;
               }
             `} ${(props.slice.end - props.slice.start) /
              props.slice.playbackRate}s
              linear;
          `]: isPlaying(),
        }}
      />

      {/* Stop button with a circular progress ring, shown while auditioning. */}
      <Show when={isPlaying()}>
        <button
          type="button"
          title="Stop"
          onClick={stopPlayback}
          class={css`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 32px;
            height: 32px;
            padding: 0;
            border: none;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.55);
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
          `}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            class={css`
              position: absolute;
              top: 0;
              left: 0;
              transform: rotate(-90deg);
            `}
          >
            <circle
              cx="16"
              cy="16"
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              stroke-width="2"
            />
            <circle
              cx="16"
              cy="16"
              r={RING_RADIUS}
              fill="none"
              stroke="#46d323"
              stroke-width="2"
              stroke-linecap="round"
              stroke-dasharray={String(RING_CIRCUMFERENCE)}
              stroke-dashoffset={String(RING_CIRCUMFERENCE * (1 - progress()))}
            />
          </svg>
          {/* Stop glyph */}
          <span
            class={css`
              width: 9px;
              height: 9px;
              background: #fff;
              border-radius: 1px;
            `}
          />
        </button>
      </Show>

      {/* Loading spinner while the source is being fetched/decoded. */}
      <Show when={loading() && !buffer()}>
        <div
          class={css`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.25);
            border-top-color: #46d323;
            border-radius: 50%;
            pointer-events: none;
            animation: ${spin} 0.8s linear infinite;
          `}
        />
      </Show>
    </div>
  );
};
