/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React, { ChangeEvent } from 'react';
import { Player as TonePlayer, Sequence, Transport } from 'tone';
import Wavesurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/src/plugin/regions';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';

import Sequencer from './Sequencer';
import { Action } from './SequencerAction';
import { Step } from './SequencerStep';
import { Slice } from './Slice';

import './VideoPlayer.css';

declare const yt: { getYouTubeVideoSource: (url: string) => Promise<string> };

const FormattedTime = ({ timeInSeconds }: { timeInSeconds: number }) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.round(timeInSeconds % 60);

  return (
    <>{`${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`}</>
  );
};

export default class VideoPlayer extends React.Component<
  {
    src: string;
    slices?: Slice[];
    steps?: Step[];
  },
  {
    currentTime: number;
    currentStep?: Step;
    selectedSlice?: Slice;
    zoom: number;
    src: string;
    length: number;
    slices: Slice[];
    steps: Step[];
  }
> {
  state = {
    currentStep: undefined,
    selectedSlice: undefined,
    currentTime: 0,
    slices: this.props.slices ?? [],
    zoom: 0,
    length: 0,
    src: this.props.src,
    steps:
      this.props.steps ??
      Array.from({ length: 16 }).map(() => ({ actions: [] as Action[] })),
  };

  tonePlayer = new TonePlayer().toDestination();

  wavesurfer: WaveSurfer = null!;

  sequence: Sequence = null!;

  regionsPlugin = RegionsPlugin.create({});

  waveformRef = React.createRef<HTMLDivElement>();

  timelineRef = React.createRef<HTMLDivElement>();

  stopPlayer = () => {
    this.tonePlayer.stop();
  };

  loadFromLocalStorage = () => {
    const storedDataString = localStorage.getItem('track');
    if (!storedDataString) return;
    try {
      const decodedData = JSON.parse(storedDataString);
      this.setState({
        steps: decodedData.steps,
        slices: decodedData.slices,
      });
    } catch {
      //
    }
  };

  saveToLocalStorage = () => {
    localStorage.setItem(
      'track',
      JSON.stringify({
        steps: this.state.steps,
        slices: this.state.slices,
      })
    );
  };

  componentDidMount = async () => {
    Transport.on('stop', this.stopPlayer);
    Transport.on('pause', this.stopPlayer);
    Transport.on('loopEnd', this.stopPlayer);

    this.loadFromLocalStorage();

    this.sequence = new Sequence(this.handleStep, this.state.steps);
    this.sequence.start();

    this.wavesurfer = Wavesurfer.create({
      container: this.waveformRef.current!,
      partialRender: true,
      plugins: [
        this.regionsPlugin,
        TimelinePlugin.create({ container: this.timelineRef.current! }),
      ],
    });

    this.startObservingRegionChanges();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typelessWavesurfer = this.wavesurfer as any;
    typelessWavesurfer.enableDragSelection({
      drag: true,
      loop: true,
      resize: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await this.loadUrl(this.props.src);
  };

  stopObservingRegionChanges = () => {
    this.wavesurfer.un('region-created', this.handleRegionCreated);
    this.wavesurfer.un('region-updated', this.handleRegionUpdated);
    this.wavesurfer.un('region-removed', this.handleRegionRemoved);
    this.wavesurfer.un('region-click', this.handleClickSlice);
    this.wavesurfer.un('region-update-end', this.handleClickSlice);
  };

  startObservingRegionChanges = () => {
    this.wavesurfer.on('region-created', this.handleRegionCreated);
    this.wavesurfer.on('region-updated', this.handleRegionUpdated);
    this.wavesurfer.on('region-removed', this.handleRegionRemoved);
    this.wavesurfer.on('region-click', this.handleClickSlice);
    this.wavesurfer.on('region-update-end', this.handleClickSlice);
  };

  handleRegionCreated = (region: Region) => {
    this.setState(
      (state) => {
        const slice: Slice = {
          id: region.id,
          start: region.start,
          end: region.end,
          playbackSpeed: 1,
          reverse: false,
        };
        return { slices: [...state.slices, slice] };
      },
      () => this.saveToLocalStorage()
    );
  };

  handleRegionUpdated = (region: Region) => {
    this.setState(
      (state) => {
        const slice = state.slices.find(({ id }) => id === region.id)!;
        const sliceIndex = state.slices.indexOf(slice);
        const updatedSlice: Slice = {
          ...slice,
          start: region.start,
          end: region.end,
        };

        return {
          slices: [
            ...state.slices.slice(0, sliceIndex),
            updatedSlice,
            ...state.slices.slice(sliceIndex + 1),
          ],
        };
      },
      () => this.saveToLocalStorage()
    );
  };

  handleRegionRemoved = (region: Region) => {
    this.setState((state) => {
      const slice = state.slices.find(({ id }) => id === region.id)!;
      const sliceIndex = state.slices.indexOf(slice);

      return {
        slices: [
          ...state.slices.slice(0, sliceIndex),
          ...state.slices.slice(sliceIndex + 1),
        ],
      };
    });
  };

  loadUrl = async (url: string) => {
    const sourceUrl = await yt.getYouTubeVideoSource(url);
    await this.tonePlayer.load(sourceUrl);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typelessWavesurfer = this.wavesurfer as any;
    typelessWavesurfer.loadDecodedBuffer(this.tonePlayer.buffer.toMono().get());

    typelessWavesurfer.clearRegions();

    this.stopObservingRegionChanges();
    this.state.slices.forEach((slice: Slice) => {
      typelessWavesurfer.addRegion(slice);
    });
    this.startObservingRegionChanges();

    this.setState({ length: this.tonePlayer.buffer.duration });
  };

  // destroy player on unmount
  componentWillUnmount = () => {
    if (this.tonePlayer) {
      this.tonePlayer.dispose();
    }
  };

  setZoom = (event: ChangeEvent<HTMLInputElement>) =>
    this.setState({ zoom: event.target.valueAsNumber }, () =>
      this.wavesurfer.zoom(this.state.zoom)
    );

  setSrc = async (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ src: e.target.value }, () => {
      this.loadUrl(this.state.src);
    });
  };

  pause = () => {
    this.tonePlayer.stop();
  };

  handleStep = (time: number, step: Step) => {
    this.setState({ currentStep: step });
    step.actions.forEach((action) => {
      this.handleAction(time, action);
    });
  };

  updateSteps = (steps: Step[]) => {
    const oldSequence = this.sequence;
    oldSequence.dispose();

    this.setState({ steps }, () => this.saveToLocalStorage());
    this.sequence = new Sequence(this.handleStep, steps);
    this.sequence.start(oldSequence.startOffset);
  };

  handleAction = (time: number, action: Action) => {
    switch (action.type) {
      case 'PLAY': {
        const slice = this.state.slices[action.slice];

        if (!slice) break;

        if (slice.start < this.tonePlayer.buffer.duration) {
          this.tonePlayer.start(time, slice.start, slice.end - slice.start);
        }
        break;
      }
      case 'PAUSE':
        this.tonePlayer.stop(time);
        break;
      case 'SET_PLAYBACK_SPEED':
        this.tonePlayer.playbackRate = action.value;
        break;
      case 'SET_REVERSE':
        this.tonePlayer.reverse = action.value;
        break;
      default:
        break;
    }
  };

  onToggleStep = (step: Step): Action[] => {
    if (step.actions.length === 0) {
      return [
        {
          type: 'PLAY',
          slice: this.state.selectedSlice
            ? this.state.slices.indexOf(this.state.selectedSlice)
            : 0,
        },
      ];
    }
    return [];
  };

  handleClickSlice = (slice: Slice) => {
    this.setState({ selectedSlice: slice });
    this.wavesurfer.seekAndCenter(
      slice.start / this.tonePlayer.buffer.duration
    );
    this.tonePlayer.start(0, slice.start, slice.end - slice.start);
  };

  handleRemoveSlice = (slice: Slice) => {
    this.wavesurfer.regions.list[slice.id]?.remove();
  };

  render = () => {
    return (
      <div className="border p-4 m-4">
        <div>current Time: {this.state.currentTime}s</div>
        <div>Length: {this.state.length}s</div>
        <div className="flex flex-col w-full">
          <div className="mb-2 w-full">
            <label className="mr-2 w-full">Youtube URL</label>
            <input
              className="border w-2/3"
              type="text"
              onChange={this.setSrc}
              value={this.state.src}
            />
          </div>

          <div ref={this.waveformRef} />
          <div ref={this.timelineRef} />
          <input
            onChange={this.setZoom}
            value={this.state.zoom}
            type="range"
            min="1"
            max="200"
          />

          <h2>Slices:</h2>
          <ol>
            {this.state.slices.map((slice) => (
              <li
                key={slice.id}
                onClick={() => this.handleClickSlice(slice)}
                className={`slice ${
                  slice === this.state.selectedSlice ? 'slice-active' : ''
                } `}
              >
                {slice.id}: <FormattedTime timeInSeconds={slice.start} /> -{' '}
                <FormattedTime timeInSeconds={slice.end} />
                <button
                  type="button"
                  onClick={() => this.handleRemoveSlice(slice)}
                >
                  Remove slice
                </button>
              </li>
            ))}
          </ol>

          <Sequencer
            steps={this.state.steps}
            currentStep={this.state.currentStep}
            onChange={this.updateSteps}
            onToggleStep={this.onToggleStep}
          />
        </div>
      </div>
    );
  };
}
