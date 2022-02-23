import { createEffect, mergeProps, onCleanup, onMount } from 'solid-js';

import { css } from '../emotion-solid';

import Wavesurfer from 'wavesurfer.js';

import { Slice } from '../engine/device/Slice';

type WavesurferSliceViewProps = {
  slice: Slice;
  center: number;
  height?: number;
  currentTime?: number;
  collapsed: boolean;
  onClickWaveform: (event: MouseEvent) => void;
};

export const WavesurferSliceView = (
  propsWithoutDefaults: WavesurferSliceViewProps
) => {
  const props = mergeProps({ currentTime: 0 }, propsWithoutDefaults);

  let waveformRef: HTMLDivElement | undefined;
  let wavesurfer: Wavesurfer;

  const handleClickWaveform = (event: MouseEvent) =>
    props.onClickWaveform(event);

  onMount(() => {
    if (!waveformRef) return;
    wavesurfer = Wavesurfer.create({
      container: waveformRef,
      waveColor: '#adadad',
      progressColor: '#ff0000',
      cursorColor: '#4353FF',
      normalize: true,
      barWidth: 1,
      barRadius: 2,
      cursorWidth: 1,
      height: props.height ?? 50,
      barGap: 0,
      fillParent: true,
      minPxPerSec: 10,
    });

    waveformRef.addEventListener('click', handleClickWaveform);
  });

  onCleanup(() => {
    if (!waveformRef) return;

    waveformRef.removeEventListener('click', handleClickWaveform);
  });

  const buffer = props.slice.createSignal(
    (slice) =>
      slice.player.buffer.length
        ? slice.player.buffer.toMono().get()
        : undefined,
    ['load', 'reverseUpdated']
  );

  createEffect(() => {
    const currentBuffer = buffer();
    if (!props.collapsed && wavesurfer && currentBuffer) {
      setTimeout(() => {
        wavesurfer.loadDecodedBuffer(currentBuffer);
      }, 200);
    }
  });

  createEffect(() => {
    wavesurfer?.setCurrentTime(props.currentTime);
  });

  return (
    <div
      ref={waveformRef}
      class={css`
        min-width: 300px;
        width: 100%;
        background-color: #464646;
        text-shadow: 1px 1px red;
        wave {
          overflow: hidden !important;
          cursor: pointer !important;
        }
      `}
    />
  );
};
