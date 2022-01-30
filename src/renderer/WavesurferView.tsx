import React, { ChangeEvent } from 'react';
import debounce from 'lodash.debounce';

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

type WavesurferViewState = { zoom: number };

export default class WavesurferView extends React.Component<
  WavesurferViewProps,
  WavesurferViewState
> {
  state = { zoom: 0 };

  wavesurfer: WaveSurfer = null!;

  regionsPlugin = RegionsPlugin.create({});

  waveformRef = React.createRef<HTMLDivElement>();

  timelineRef = React.createRef<HTMLDivElement>();

  async componentDidMount() {
    this.waveformRef.current?.addEventListener('wheel', this.scrollZoom);

    this.wavesurfer = Wavesurfer.create({
      container: this.waveformRef.current!,
      partialRender: true,
      plugins: [
        this.regionsPlugin,
        TimelinePlugin.create({
          container: this.timelineRef.current!,
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
    const typelessWavesurfer = this.wavesurfer as any;
    typelessWavesurfer.enableDragSelection({
      drag: true,
      loop: true,
      resize: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    typelessWavesurfer.clearRegions();

    this.props.onWavesurferInstance(this.wavesurfer);

    this.startObservingRegionChanges();
  }

  componentDidUpdate(prevProps: WavesurferViewProps) {
    const { buffer } = this.props;
    if (prevProps.buffer !== buffer && buffer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typelessWavesurfer = this.wavesurfer as any;
      typelessWavesurfer.loadDecodedBuffer(buffer.toMono().get());
    }
  }

  componentWillUnmount() {
    this.waveformRef.current?.removeEventListener('wheel', this.scrollZoom);
  }

  handleZoomChanged = (event: ChangeEvent<HTMLInputElement>) =>
    this.setZoom(event.target.valueAsNumber);

  setZoom = (zoom: number) =>
    this.setState({ zoom }, this.updateWavesurferZoom);

  // eslint-disable-next-line react/sort-comp
  updateWavesurferZoom = debounce(
    () => this.wavesurfer.zoom(this.state.zoom),
    200
  );

  scrollZoom = (event: WheelEvent) => {
    const newZoom = Math.min(Math.max(this.state.zoom + event.deltaY, 1), 200);

    if (this.state.zoom !== newZoom) {
      event.preventDefault();
      this.setZoom(newZoom);
    }
  };

  stopObservingRegionChanges = () => {
    this.wavesurfer.un('region-created', this.props.onRegionCreated);
    this.wavesurfer.un('region-updated', this.props.onRegionUpdated);
    this.wavesurfer.un('region-removed', this.props.onRegionRemoved);
    this.wavesurfer.un('region-click', this.props.onRegionClick);
    this.wavesurfer.un('region-update-end', this.props.onRegionClick);
  };

  startObservingRegionChanges = () => {
    this.wavesurfer.on('region-created', this.props.onRegionCreated);
    this.wavesurfer.on('region-updated', this.props.onRegionUpdated);
    this.wavesurfer.on('region-removed', this.props.onRegionRemoved);
    this.wavesurfer.on('region-click', this.props.onRegionClick);
    this.wavesurfer.on('region-update-end', this.props.onRegionClick);
  };

  render() {
    return (
      <>
        <div ref={this.waveformRef} className="lcd" style={{ margin: '2px' }} />
        <div ref={this.timelineRef} className="lcd" style={{ margin: '2px' }} />
        <input
          onChange={this.handleZoomChanged}
          value={this.state.zoom}
          type="number"
          min="1"
          max="200"
          step="10"
        />
      </>
    );
  }
}
