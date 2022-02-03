import { createSignal, createEffect, onMount, onCleanup } from 'solid-js';

import { debounce } from 'ts-debounce';

import Wavesurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/src/plugin/regions';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';
import { Sampler } from './engine/Sampler';
import { SliceChain } from './engine/SliceChain';
import { Slice } from './Slice';

type WavesurferViewProps = {
  sampler: Sampler;
  center: number;
  onRegionClick: (region: Region) => void;
};

export const WavesurferView = (props: WavesurferViewProps) => {
  const [zoom, setZoom] = createSignal(0);

  let waveformRef: HTMLDivElement | undefined;
  let timelineRef: HTMLDivElement | undefined;
  let wavesurfer: Wavesurfer;

  const handleZoomChanged = (event: { currentTarget: HTMLInputElement }) =>
    setZoom(event.currentTarget.valueAsNumber);

  const scrollZoom = (event: WheelEvent) => {
    event.preventDefault();
    setZoom(Math.min(Math.max(zoom() + event.deltaY, 1), 300));
  };

  const handleChainAdded = (chain: SliceChain) => {
    const slice = chain.getSlice();
    const region = wavesurfer.regions.list[slice.id];

    if (!region) {
      const { id, color, start, end } = slice;
      wavesurfer.regions.add({ id, color, start, end });
    }
  };

  const handleChainRemoved = (chain: SliceChain) => {
    const slice = chain.getSlice();
    const region = wavesurfer.regions.list[slice.id];

    if (region) {
      region.remove();
    }
  };

  const handleChainUpdated = (chain: SliceChain) => {
    const slice = chain.getSlice();
    const region = wavesurfer.regions.list[slice.id];

    if (region) {
      const { id, color, start, end } = slice;
      region.update({ id, color, start, end });
    }
  };

  const handleRegionCreated = (region: Region) => {
    const existingChain = props.sampler.getChain(region.id);
    if (existingChain) return;

    const randR = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const randG = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const randB = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    const color = `rgba(${randR},${randG},${randB},0.8)`;

    const slice: Slice = {
      id: region.id,
      start: region.start,
      end: region.end,
      playbackSpeed: 1,
      reverse: false,
      volume: 1,
      color,
      patterns: [
        Array.from({ length: 16 }).map(() => ({
          actions: [],
        })),
      ],
    };

    props.sampler.createChain(slice);
    region.update({ id: region.id, color });
  };

  const handleRegionUpdated = (region: Region) => {
    const chain = props.sampler.getChain(region.id);

    if (!chain) return;

    const slice = chain.getSlice();

    if (slice.start !== region.start || slice.end !== region.end) {
      chain.setSlice({
        ...slice,
        start: region.start,
        end: region.end,
      });
    }
  };

  const handleRegionRemoved = (region: Region) => {
    props.sampler.removeChain(region.id);
  };

  onMount(() => {
    wavesurfer = Wavesurfer.create({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      container: waveformRef!,
      plugins: [
        RegionsPlugin.create({}),
        TimelinePlugin.create({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          container: timelineRef!,
          zoomDebounce: 200,
        }),
      ],
      waveColor: '#222',
      progressColor: '#222',
      cursorColor: '#4353FF',
      normalize: true,
      barWidth: 1,
      barRadius: 1,
      cursorWidth: 0,
      height: 100,
      barGap: 1,
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
    wavesurfer.un('region-created', handleRegionCreated);
    wavesurfer.un('region-updated', handleRegionUpdated);
    wavesurfer.un('region-removed', handleRegionRemoved);
    wavesurfer.un('region-click', props.onRegionClick);
    wavesurfer.un('region-update-end', props.onRegionClick);
  });

  onMount(async () => {
    await props.sampler.hasLoaded();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (wavesurfer as any).loadDecodedBuffer(props.sampler.buffer.toMono().get());
  });

  onMount(() => {
    props.sampler.on('chain-added', handleChainAdded);
    props.sampler.on('chain-removed', handleChainRemoved);
    props.sampler.on('chain-updated', handleChainUpdated);
  });

  onCleanup(() => {
    props.sampler.on('chain-added', handleChainAdded);
    props.sampler.on('chain-removed', handleChainRemoved);
    props.sampler.on('chain-updated', handleChainUpdated);
  });

  createEffect(() => {
    if (!wavesurfer) return;
    wavesurfer.seekAndCenter(props.center);
  });

  const updateWavesurferZoomDebounced = debounce(
    (newZoom: number) => wavesurfer.zoom(newZoom),
    100
  );

  createEffect(() => updateWavesurferZoomDebounced(zoom()));

  return (
    <>
      <div ref={waveformRef} class="lcd" style={{ margin: '2px' }} />
      <div ref={timelineRef} class="lcd" style={{ margin: '2px' }} />
      <input
        onChange={handleZoomChanged}
        value={zoom()}
        type="number"
        min="1"
        max="200"
        step="10"
      />
    </>
  );
};
