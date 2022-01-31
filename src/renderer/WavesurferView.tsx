import { createSignal, createEffect, onMount, onCleanup } from 'solid-js';

import { debounce } from 'ts-debounce';

import { ToneAudioBuffer } from 'tone';
import Wavesurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/src/plugin/regions';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';

type WavesurferViewProps = {
  buffer: ToneAudioBuffer | null;
  onRegionCreated: (region: Region) => void;
  onRegionUpdated: (region: Region) => void;
  onRegionRemoved: (region: Region) => void;
  onRegionClick: (region: Region) => void;
  onWavesurferInstance: (wavesurfer: Wavesurfer) => void;
};

export const WavesurferView = (props: WavesurferViewProps) => {
  const [zoom, setZoom] = createSignal(1);

  let waveformRef: HTMLDivElement | undefined;
  let timelineRef: HTMLDivElement | undefined;
  let wavesurfer: Wavesurfer;

  const handleZoomChanged = (event: { currentTarget: HTMLInputElement }) =>
    setZoom(event.currentTarget.valueAsNumber);

  const scrollZoom = (event: WheelEvent) => {
    event.preventDefault();
    setZoom(Math.min(Math.max(zoom() + event.deltaY, 1), 300));
  };

  onMount(async () => {
    wavesurfer = Wavesurfer.create({
      container: waveformRef!,
      partialRender: true,
      plugins: [
        RegionsPlugin.create({}),
        TimelinePlugin.create({
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
    const typelessWavesurfer = wavesurfer as any;
    typelessWavesurfer.enableDragSelection({
      drag: true,
      loop: true,
      resize: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    typelessWavesurfer.clearRegions();

    props.onWavesurferInstance(wavesurfer);

    timelineRef?.addEventListener('wheel', scrollZoom);
    wavesurfer.on('region-created', props.onRegionCreated);
    wavesurfer.on('region-updated', props.onRegionUpdated);
    wavesurfer.on('region-removed', props.onRegionRemoved);
    wavesurfer.on('region-click', props.onRegionClick);
    wavesurfer.on('region-update-end', props.onRegionClick);
  });

  onCleanup(() => {
    timelineRef?.removeEventListener('wheel', scrollZoom);
    wavesurfer.un('region-created', props.onRegionCreated);
    wavesurfer.un('region-updated', props.onRegionUpdated);
    wavesurfer.un('region-removed', props.onRegionRemoved);
    wavesurfer.un('region-click', props.onRegionClick);
    wavesurfer.un('region-update-end', props.onRegionClick);
  });

  createEffect(() => {
    if (props.buffer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typelessWavesurfer = wavesurfer as any;
      typelessWavesurfer.loadDecodedBuffer(props.buffer.toMono().get());
    }
  });

  const updateWavesurferZoomDebounced = debounce(
    (newZoom: number) => wavesurfer.zoom(newZoom),
    100
  );

  createEffect(() => updateWavesurferZoomDebounced(zoom()));

  return (
    <>
      <div ref={waveformRef} className="lcd" style={{ margin: '2px' }} />
      <div ref={timelineRef} className="lcd" style={{ margin: '2px' }} />
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
