import { createSignalFromEventEmitter } from 'renderer/engine/EngineBase';
import { createEffect, onMount, onCleanup } from 'solid-js';

import { debounce } from 'ts-debounce';

import Wavesurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/src/plugin/regions';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';
import { SamplerDevice } from '../engine/device/Sampler';
import { SerializedSlice, Slice } from '../engine/device/Slice';

type WavesurferViewProps = {
  sampler: SamplerDevice;
  center: number;
  onRegionClick: (region: Region) => void;
};

export const WavesurferView = (props: WavesurferViewProps) => {
  const zoom = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.zoom,
    'zoomUpdated'
  );

  let waveformRef: HTMLDivElement | undefined;
  let timelineRef: HTMLDivElement | undefined;

  const collapsed = createSignalFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.collapsed,
    'collapsedUpdated'
  );

  const showDevices = createSignalFromEventEmitter(
    () => props.sampler.engine,
    (engine) => engine.viewMode.device,
    ['viewModeUpdated']
  );

  let wavesurfer: Wavesurfer;

  const scrollZoom = debounce((event: WheelEvent) => {
    event.preventDefault();

    const newZoom = Math.min(Math.max(zoom() + event.deltaY, 1), 800);
    if (newZoom !== zoom()) {
      props.sampler.set({ zoom: newZoom });
    }
  }, 100);

  const handleSliceAdded = (slice: Slice) => {
    console.log('handleSliceAdded');
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
    console.log('handleSliceUpdated');
    const region = wavesurfer.regions.list[slice.id];

    if (region) {
      const { id, color, start, end } = slice;
      region.update({ id, color, start, end });
    }
  };

  const handleRegionCreated = async (region: Region) => {
    console.log('handleRegionCreated');
    const existingSlice = props.sampler.findSlice(region.id);

    if (existingSlice) {
      region.update({ id: region.id, color: existingSlice.color });
    } else {
      const randR = Math.floor(Math.random() * (255 - 0 + 1) + 0);
      const randG = Math.floor(Math.random() * (255 - 0 + 1) + 0);
      const randB = Math.floor(Math.random() * (255 - 0 + 1) + 0);
      const color = `rgba(${randR},${randG},${randB},0.8)`;
      region.update({ id: region.id, color });
    }
  };

  const handleRegionUpdated = (region: Region) => {
    console.log('handleRegionUpdated');
    const slice = props.sampler.findSlice(region.id);

    if (!slice) {
      const { id, start, end, color } = region;

      const slice: SerializedSlice = Slice.normalizeData({
        id,
        start,
        end,
        color,
      });

      props.sampler.createSlice(slice);
    } else {
      if (slice.start !== region.start || slice.end !== region.end) {
        slice.set({
          start: region.start,
          end: region.end,
        });
      }
    }
  };

  const handleRegionRemoved = (region: Region) => {
    const slice = props.sampler.findSlice(region.id);
    if (slice) props.sampler.removeSlice(slice);
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

    props.sampler.slices.forEach((slice) => {
      handleSliceAdded(slice);
    });
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
    () => props.sampler,
    (sampler) =>
      sampler.buffer.length ? sampler.buffer.toMono().get() : undefined,
    'load'
  );

  createEffect(() => {
    if (!collapsed() && showDevices() && wavesurfer && buffer()) {
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
