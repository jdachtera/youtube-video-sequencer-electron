import { createEffect, onMount, onCleanup, untrack } from 'solid-js';

import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { debounce } from 'ts-debounce';

import Wavesurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/src/plugin/regions';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';
import { Sampler } from './engine/Sampler';
import { SamplerSlice } from './engine/SamplerSlice';
import { SerializedSlice } from './engine/types';

type WavesurferViewProps = {
  sampler: Sampler;
  center: number;
  onRegionClick: (region: Region) => void;
};

export const WavesurferView = (props: WavesurferViewProps) => {
  const zoom = createSignalFromEventEmitter(
    untrack(() => props.sampler),
    'zoom-updated',
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

  const handleChainAdded = (chain: SamplerSlice) => {
    const slice = chain.serialize();
    const region = wavesurfer.regions.list[slice.id];

    if (!region) {
      const { id, color, start, end } = slice;
      wavesurfer.regions.add({ id, color, start, end });
    }
  };

  const handleChainRemoved = (chain: SamplerSlice) => {
    const slice = chain.serialize();
    const region = wavesurfer.regions.list[slice.id];

    if (region) {
      region.remove();
    }
  };

  const handleChainUpdated = (chain: SamplerSlice) => {
    const slice = chain.serialize();
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

    const slice: SerializedSlice = {
      id: region.id,
      collapsed: true,
      start: region.start,
      end: region.end,
      playbackSpeed: 1,
      reverse: false,
      solo: false,
      name: '',
      volume: 1,
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
    };

    props.sampler.createChain(slice);
    region.update({ id: region.id, color });
  };

  const handleRegionUpdated = (region: Region) => {
    const chain = props.sampler.getChain(region.id);

    if (!chain) return;

    const slice = chain.serialize();

    if (slice.start !== region.start || slice.end !== region.end) {
      chain.update({
        start: region.start,
        end: region.end,
      });
    }
  };

  const startPlayback = () => {
    wavesurfer.play();
  };

  const handleRegionRemoved = (region: Region) => {
    props.sampler.removeChain(region.id);
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
    props.sampler.on('chain-added', handleChainAdded);
    props.sampler.on('chain-removed', handleChainRemoved);
    props.sampler.on('chain-updated', handleChainUpdated);
  });

  onCleanup(() => {
    props.sampler.off('chain-added', handleChainAdded);
    props.sampler.off('chain-removed', handleChainRemoved);
    props.sampler.off('chain-updated', handleChainUpdated);
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
