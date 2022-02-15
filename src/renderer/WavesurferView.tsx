import { createEffect, onMount, onCleanup, untrack } from 'solid-js';

import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { debounce } from 'ts-debounce';

import Wavesurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/src/plugin/regions';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';
import { Sampler } from './engine/device/Sampler';
import { Slice } from './engine/device/Slice';
import { SerializedSlice } from './engine/types';
import { normalizeSliceData } from './engine/normalizeData';

type WavesurferViewProps = {
  sampler: Sampler;
  center: number;
  onRegionClick: (region: Region) => void;
};

export const WavesurferView = (props: WavesurferViewProps) => {
  const zoom = createSignalFromEventEmitter(
    untrack(() => props.sampler),
    'zoomUpdated',
    (sampler) => sampler.zoom
  );

  let waveformRef: HTMLDivElement | undefined;
  let timelineRef: HTMLDivElement | undefined;

  let wavesurfer: Wavesurfer;

  const scrollZoom = (event: WheelEvent) => {
    event.preventDefault();
    const newZoom = Math.min(Math.max(zoom() + event.deltaY, 1), 800);
    props.sampler.update({ zoom: newZoom });
  };

  const handleSliceAdded = (slice: Slice) => {
    const region = wavesurfer.regions.list[slice.id];

    if (!region) {
      const { id, color, start, end } = slice;
      wavesurfer.regions.add({ id, color, start, end });
    }
  };

  const handleSliceRemoved = (slice: Slice) => {
    const region = wavesurfer.regions.list[slice.id];

    if (region) {
      region.remove();
    }
  };

  const handleSliceUpdated = (slice: Slice) => {
    const region = wavesurfer.regions.list[slice.id];

    if (region) {
      const { id, color, start, end } = slice;
      region.update({ id, color, start, end });
    }
  };

  const handleRegionCreated = (region: Region) => {
    const existingSlice = props.sampler.getSlice(region.id);
    if (existingSlice) return;

    const randR = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const randG = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const randB = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const color = `rgba(${randR},${randG},${randB},0.8)`;

    const slice: SerializedSlice = normalizeSliceData({
      id: region.id,
      collapsed: true,
      start: region.start,
      end: region.end,
      color,
      patterns: [
        {
          subdivision: 16,
          subdivisionType: 'n',
          steps: Array.from({ length: 16 }).map(() => ({
            actions: [],
          })),
        },
      ],
    });

    props.sampler.createSlice(slice);
    region.update({ id: region.id, color });
  };

  const handleRegionUpdated = (region: Region) => {
    const slice = props.sampler.getSlice(region.id);

    if (!slice) return;

    if (slice.start !== region.start || slice.end !== region.end) {
      slice.update({
        start: region.start,
        end: region.end,
      });
    }
  };

  const startPlayback = () => {
    wavesurfer.play();
  };

  const handleRegionRemoved = (region: Region) => {
    props.sampler.removeSlice(region.id);
  };

  onMount(() => {
    if (!waveformRef || !timelineRef) return;
    wavesurfer = Wavesurfer.create({
      container: waveformRef,
      plugins: [
        RegionsPlugin.create({}),
        TimelinePlugin.create({
          container: timelineRef,
          zoomDebounce: 1,
          timeInterval: (pxPersec: number) => {
            return 0.2;
          },
          height: 30,
        }),
      ],
      waveColor: '#222',
      progressColor: '#ff2f2f',
      cursorColor: '#4353FF',
      normalize: true,
      barWidth: 1,
      barRadius: 1,
      cursorWidth: 2,
      height: 100,
      barGap: 1,
      partialRender: true,
      scrollParent: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (wavesurfer as any).enableDragSelection({
      drag: true,
      loop: true,
      resize: true,
    });

    wavesurfer.regions.clear();

    timelineRef?.addEventListener('wheel', scrollZoom);
    wavesurfer.on('region-created', handleRegionCreated);
    wavesurfer.on('region-updated', handleRegionUpdated);
    wavesurfer.on('region-removed', handleRegionRemoved);
    wavesurfer.on('region-click', props.onRegionClick);
    wavesurfer.on('region-update-end', props.onRegionClick);
  });

  onCleanup(() => {
    timelineRef?.removeEventListener('wheel', scrollZoom);
    if (!wavesurfer) return;
    wavesurfer.un('region-created', handleRegionCreated);
    wavesurfer.un('region-updated', handleRegionUpdated);
    wavesurfer.un('region-removed', handleRegionRemoved);
    wavesurfer.un('region-click', props.onRegionClick);
    wavesurfer.un('region-update-end', props.onRegionClick);
  });

  const buffer = createSignalFromEventEmitter(
    untrack(() => props.sampler),
    'load',
    (sampler) =>
      sampler.buffer.length ? sampler.buffer.toMono().get() : undefined
  );

  createEffect(() => {
    if (wavesurfer && buffer()) {
      wavesurfer.loadDecodedBuffer(buffer());
    }
  });

  onMount(() => {
    props.sampler.on('sliceAdded', handleSliceAdded);
    props.sampler.on('sliceRemoved', handleSliceRemoved);
    props.sampler.on('sliceUpdated', handleSliceUpdated);
  });

  onCleanup(() => {
    props.sampler.off('sliceAdded', handleSliceAdded);
    props.sampler.off('sliceRemoved', handleSliceRemoved);
    props.sampler.off('sliceUpdated', handleSliceUpdated);
  });

  createEffect(() => wavesurfer?.seekAndCenter(props.center));

  const updateWavesurferZoomDebounced = debounce(
    (newZoom: number) => wavesurfer.zoom(newZoom),
    100
  );

  createEffect(() => updateWavesurferZoomDebounced(zoom()));

  return (
    <>
      <div ref={waveformRef} style={{ margin: '2px' }} />
      <div ref={timelineRef} style={{ margin: '2px' }} />
    </>
  );
};
