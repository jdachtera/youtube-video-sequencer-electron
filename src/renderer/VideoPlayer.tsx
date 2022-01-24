/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React, { ChangeEvent } from 'react';
import { Sequence, Transport } from 'tone';
import Wavesurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/src/plugin/regions';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';
import PolyPlayer from './PolyPlayer';

import Sequencer from './Sequencer';
import { Action } from './SequencerAction';
import { Step } from './SequencerStep';
import { Slice } from './Slice';

import './VideoPlayer.scss';

import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';

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
    currentPatternIndex: number;
    selectedSlice?: Slice;
    zoom: number;
    src: string;
    length: number;
    slices: Slice[];
    sequences: Sequence[];
  }
> {
  state = {
    currentStep: undefined,
    selectedSlice: undefined,
    currentPatternIndex: 0,
    currentTime: 0,
    slices: this.props.slices ?? [],
    zoom: 0,
    length: 0,
    src: this.props.src,
    pattern: [] as Step[][],
    sequences: [] as Sequence[],
  };

  tonePlayer = new PolyPlayer().toDestination();

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
        slices: decodedData.slices,
        sequences: decodedData.slices.map((slice: Slice) =>
          new Sequence((time, step: Step) => {
            this.handleStep(time, step, slice);
          }, slice.patterns[0]).start()
        ),
      });
      this.tonePlayer.setPolyphony(decodedData.slices.length);
    } catch {
      //
    }
  };

  saveToLocalStorage = () => {
    localStorage.setItem(
      'track',
      JSON.stringify({
        slices: this.state.slices,
      })
    );
  };

  componentDidMount = async () => {
    Transport.on('stop', this.stopPlayer);
    Transport.on('pause', this.stopPlayer);
    Transport.on('loopEnd', this.stopPlayer);

    this.loadFromLocalStorage();

    this.wavesurfer = Wavesurfer.create({
      container: this.waveformRef.current!,
      partialRender: true,
      plugins: [
        this.regionsPlugin,
        TimelinePlugin.create({ container: this.timelineRef.current! }),
      ],
      waveColor: '#222',
      progressColor: '#222',
      cursorColor: '#4353FF',
      barWidth: 1,
      barRadius: 1,
      cursorWidth: 0,
      height: 100,
      barGap: 1,
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
    //this.wavesurfer.on('region-click', this.handleClickSlice);
    //this.wavesurfer.on('region-update-end', this.handleClickSlice);
  };

  handleRegionCreated = (region: Region) => {
    let randR = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    let randG = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    let randB = Math.floor(Math.random() * (255 - 0 + 1) + 0);
    let color = `rgba(${randR},${randG},${randB},0.8)`;
    this.setState(
      (state) => {
        const slice: Slice = {
          id: region.id,
          start: region.start,
          end: region.end,
          playbackSpeed: 1,
          reverse: false,
          color: color,
          patterns: [
            Array.from({ length: 16 }).map(() => ({
              actions: [],
            })),
          ],
        };

        const sequence = new Sequence((time, step: Step) => {
          this.handleStep(time, step, slice);
        }, slice.patterns[0]).start();

        return {
          slices: [...state.slices, slice],
          sequences: [...state.sequences, sequence],
        };
      },
      () => {
        this.tonePlayer.setPolyphony(this.state.slices.length);
        this.saveToLocalStorage();
      }
    );
  };

  handleRegionUpdated = async (region: Region) => {
    await this.setState(
      (state) => {
        const slice = state.slices.find(({ id }) => id === region.id)!;
        const sliceIndex = this.state.slices.findIndex(
          ({ id }) => id === slice.id
        );
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
    this.setState(
      (state) => {
        const slice = state.slices.find(({ id }) => id === region.id)!;
        const sliceIndex = this.state.slices.findIndex(
          ({ id }) => id === slice.id
        );

        const sequenceToDispose = this.state.sequences[sliceIndex];
        sequenceToDispose.dispose();

        return {
          slices: [
            ...state.slices.slice(0, sliceIndex),
            ...state.slices.slice(sliceIndex + 1),
          ],
          sequences: [
            ...state.sequences.slice(0, sliceIndex),
            ...state.sequences.slice(sliceIndex + 1),
          ],
        };
      },
      () => {
        () => this.saveToLocalStorage();
        this.tonePlayer.setPolyphony(this.state.slices.length);
      }
    );
  };

  updateSlice = (slice: Slice, callback?: () => void) =>
    this.setState((state) => {
      const sliceIndex = state.slices.findIndex(({ id }) => id === slice.id);

      return {
        slices: [
          ...state.slices.slice(0, sliceIndex),
          slice,
          ...state.slices.slice(sliceIndex + 1),
        ],
      };
    }, callback);

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

  handleStep = (time: number, step: Step, slice: Slice) => {
    this.setState({ currentStep: step });

    const sliceIndex = this.state.slices.findIndex(({ id }) => id === slice.id);

    step.actions.forEach((action) => {
      this.handleAction(time, action, sliceIndex);
    });
  };

  updateSteps = (slice: Slice, steps: Step[]) => {
    const sliceIndex = this.state.slices.findIndex(({ id }) => id === slice.id);
    this.state.sequences[sliceIndex].events = steps;

    this.setState(
      (state) => {
        const updatedSlice: Slice = {
          ...slice,
          patterns: [
            ...slice.patterns.slice(0, this.state.currentPatternIndex),
            steps,
            ...slice.patterns.slice(this.state.currentPatternIndex + 1),
          ],
        };
        return {
          slices: [
            ...state.slices.slice(0, sliceIndex),
            updatedSlice,
            ...state.slices.slice(sliceIndex + 1),
          ],
        };
      },
      () => {
        this.saveToLocalStorage();
      }
    );
  };

  handleAction = (time: number, action: Action, sliceIndex: number) => {
    switch (action.type) {
      case 'PLAY': {
        const slice = this.state.slices[sliceIndex];

        if (!slice) break;

        if (slice.start < this.tonePlayer.buffer.duration) {
          this.tonePlayer
            .getPlayer(sliceIndex)
            .start(time, slice.start, slice.end - slice.start);
        }
        break;
      }
      case 'PAUSE':
        this.tonePlayer.getPlayer(sliceIndex).stop(time);
        break;
      case 'SET_PLAYBACK_SPEED':
        this.tonePlayer.getPlayer(sliceIndex).playbackRate = action.value;
        break;
      case 'SET_REVERSE':
        this.tonePlayer.getPlayer(sliceIndex).reverse = action.value;
        break;
      default:
        break;
    }
  };

  onToggleStep = (step: Step): Action[] => {
    if (step.actions.length === 0) {
      return [{ type: 'PLAY' }];
    }
    return [];
  };

  handleClickSlice = (slice: Slice) => {
    this.setState({ selectedSlice: slice });
    const sliceIndex = this.state.slices.findIndex(({ id }) => id === slice.id);

    if (sliceIndex === -1) return;

    this.wavesurfer.seekAndCenter(
      slice.start / this.tonePlayer.buffer.duration
    );
    this.tonePlayer
      .getPlayer(sliceIndex)
      .start(0, slice.start, slice.end - slice.start);
  };

  handleRemoveSlice = (slice: Slice) => {
    this.wavesurfer.regions.list[slice.id]?.remove();
  };

  updateSequenceLength = (slice: Slice, newLength: number) => {
    const steps = slice.patterns[this.state.currentPatternIndex];

    if (steps.length > newLength) {
      this.updateSteps(slice, steps.slice(0, newLength));
    } else if (steps.length < newLength) {
      this.updateSteps(slice, [
        ...steps.slice(0),
        ...Array.from({ length: newLength - steps.length }).map(() => ({
          actions: [],
        })),
      ]);
    }
  };

  render = () => {
    return (
      <div className="border p-4 m-4">
        <div style={{display: 'flex'}}>
          <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px inset #222', borderBottom: '1px outset #777', boxShadow: '0px 0px 2px #222'}}>
            <img src={ScrewHeadWithHole} width="35px" style={{ margin: '8px'}}/>  
            <img src={ScrewHeadWithHole} width="35px" style={{ margin: '8px'}}/>
          </div>
        <div style={{borderBottom: '1px solid #222', boxShadow: '0px 0px 3px #222', padding: '10px', width: '100%'}}>

        <div>current Time: {this.state.currentTime}s</div>
        <div>Length: {this.state.length}s</div>
        <div className="flex flex-col w-full">
          <div className="mb-2 w-full">
            <label className="mr-2 w-full">Youtube URL</label>
            <input
              className="border w-2/3 lcd"
              type="text"
              onChange={this.setSrc}
              value={this.state.src}
            />
          </div>

          <div ref={this.waveformRef} className="lcd" style={{margin: '2px' }}/>
          <div ref={this.timelineRef} className="lcd" style={{margin: '2px' }} />
          <input
            onChange={this.setZoom}
            value={this.state.zoom}
            type="number"
            min="1"
            max="200"
            step="10"
            />

          <ol>
            {this.state.slices.map((slice) => (
              <li
              style={{ background: slice.color }}
              key={slice.id}
              onClick={() => this.handleClickSlice(slice)}
              className={`slice ${
                slice === this.state.selectedSlice ? 'slice-active' : ''
              } `}
              >
                <span className="lcd">{slice.id}</span>
                <FormattedTime timeInSeconds={slice.start} /> -{' '}
                <FormattedTime timeInSeconds={slice.end} />
                <input
                  className="lcd"
                  type="number"
                  step="1"
                  min="4"
                  max="64"
                  value={slice.patterns[this.state.currentPatternIndex].length}
                  onChange={(event) =>
                    this.updateSequenceLength(slice, event.target.valueAsNumber)
                  }
                  />
                <button
                  type="button"
                  onClick={() => this.handleRemoveSlice(slice)}
                  >
                  Remove slice
                </button>
                <Sequencer
                  steps={slice.patterns[this.state.currentPatternIndex]}
                  currentStep={this.state.currentStep}
                  onChange={(step) => this.updateSteps(slice, step)}
                  onToggleStep={(step) => this.onToggleStep(step)}
                  />
              </li>
            ))}
          </ol>
        </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px inset #222', borderBottom: '1px outset #777', boxShadow: '0px 0px 2px #222'}}>
            <img src={ScrewHeadWithHole} width="35px" style={{ margin: '8px'}}/>  
            <img src={ScrewHeadWithHole} width="35px" style={{ margin: '8px'}}/>
          </div>
        </div>
      </div>
    );
  };
}
