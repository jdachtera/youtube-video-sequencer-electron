import { css } from '@emotion/css';
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { Time } from 'tone';
import { debounce } from 'ts-debounce';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Row } from '../UI/Grid';
import { MasterMeter } from '../UI/MasterMeter';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { RangeInput } from '../UI/RangeInput';
import { InputLCD } from '../UI/lcdStyles';
import { Engine, LAUNCH_QUANTIZATIONS } from '../engine/Engine';
import type { LaunchQuantization } from '../engine/Engine';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import { DeviceChain } from '../engine/device/DeviceChain';
import { SamplerDevice } from '../engine/device/Sampler';
import { bpmFromTaps, pushTap } from '../engine/tapTempo';
import type { DeepPartial } from '../engine/types';
import { AccountMenu } from './AccountMenu';
import { ChannelSwitcher } from './ChannelSwitcher';
import { MidiControls } from './MidiControls';

// Ableton-style launch-quantization labels for the global transport cue grid.
const LAUNCH_QUANTIZATION_LABELS: Record<LaunchQuantization, string> = {
  none: 'None',
  '8m': '8 Bars',
  '4m': '4 Bars',
  '2m': '2 Bars',
  '1m': '1 Bar',
  '2n': '1/2',
  '2t': '1/2T',
  '4n': '1/4',
  '4t': '1/4T',
  '8n': '1/8',
  '8t': '1/8T',
  '16n': '1/16',
  '16t': '1/16T',
  '32n': '1/32',
};

export const Toolbar = (props: { engine: Engine }) => {
  const engineState = createStoreFromEventEmitter(
    () => props.engine,
    (engine) => ({
      bpm: engine.transport.bpm.value,
      viewMode: engine.viewMode,
      swing: engine.transport.swing,
      currentPatternIndex: engine.currentPatternIndex,
      zoom: engine.zoom,
      playing: engine.transport.state === 'started',
      volume: engine.gain.gain.value,
      launchQuantization: engine.launchQuantization,
    }),
    [
      'bpmUpdated',
      'swingUpdated',
      'viewModeUpdated',
      'zoomUpdated',
      'launchQuantizationUpdated',
      'start',
      'stop',
    ],
  );

  const currentPosition = createSignalFromEventEmitter(
    () => props.engine,
    (engine) =>
      Time(engine.transport.position).toBarsBeatsSixteenths().split('.')[0],
    ['draw'],
  );

  const metronomeEnabled = createSignalFromEventEmitter(
    () => props.engine,
    (engine) => engine.metronome.enabled,
    ['metronomeUpdated'],
  );

  const countInBars = createSignalFromEventEmitter(
    () => props.engine,
    (engine) => engine.metronome.countInBars,
    ['countInUpdated'],
  );

  const togglePlay = async () => {
    if (engineState.playing) {
      props.engine.stop();
    } else {
      props.engine.start();
    }
  };

  // The click track is a monitoring preference, not project data, so it's
  // persisted on its own key rather than in the serialized project.
  const toggleMetronome = () => {
    const enabled = !metronomeEnabled();
    props.engine.setMetronome(enabled);
    localStorage.setItem('metronome', enabled ? '1' : '0');
  };

  const handleCountInChange = (bars: number) => {
    props.engine.setCountIn(bars);
    localStorage.setItem(
      'metronome.countIn',
      String(props.engine.metronome.countInBars),
    );
  };

  onMount(() => {
    if (localStorage.getItem('metronome') === '1') {
      props.engine.setMetronome(true);
    }
    const storedCountIn = Number(localStorage.getItem('metronome.countIn'));
    if (Number.isFinite(storedCountIn) && storedCountIn > 0) {
      props.engine.setCountIn(storedCountIn);
    }
  });

  // Undo/redo + Export shortcuts moved to the native menu (see AppMenu); the
  // toolbar keeps Play (Space) and closing the side panel (Escape).
  const handleKeydown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const mod = event.metaKey || event.ctrlKey;

    if (!mod && event.code === 'Space') {
      event.preventDefault();
      togglePlay();
      return;
    }

    if (event.code === 'Escape' && engineState.viewMode.sidePanel.open) {
      props.engine.set({
        viewMode: {
          ...engineState.viewMode,
          sidePanel: { open: false },
        },
      });
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  const handleTempoChange = (bpm: number) => {
    props.engine.set({ bpm });
  };

  // Tap tempo: derive BPM from the spacing of recent taps on the TAP button.
  let taps: number[] = [];
  const tapTempo = () => {
    taps = pushTap(taps, Date.now());
    const bpm = bpmFromTaps(taps);
    if (bpm !== null) {
      handleTempoChange(Math.max(20, Math.min(280, Math.round(bpm))));
    }
  };

  const handleSwingChange = (swing: number) => {
    props.engine.set({ swing });
  };

  const [lastSaved, setLastSaved] = createSignal<number>();

  const saveToLocalStorage = debounce((engine: Engine) => {
    localStorage.setItem('track', JSON.stringify(engine.serialize()));
    setLastSaved(Date.now());
  }, 500);

  onMount(() => props.engine.on('change', saveToLocalStorage));
  onCleanup(() => props.engine.off('change', saveToLocalStorage));

  onMount(() => {
    let parsedData: DeepPartial<ReturnType<Engine['serialize']>> | undefined;
    const storedDataString = localStorage.getItem('track');

    if (storedDataString) {
      try {
        parsedData = JSON.parse(storedDataString) as
          | DeepPartial<ReturnType<Engine['serialize']>>
          | undefined;
      } catch {
        //
      }
    }

    props.engine.set(Engine.normalizeData(parsedData ?? {}));
  });

  const [minimized, setMinimized] = createSignal(false);

  return (
    <div>
      <div
        class={css`
          background: #333;
          padding: 8px;
        `}
      >
        <Row
          classList={{
            [css`
              flex-wrap: wrap;
              align-items: center;
              row-gap: 6px;
              column-gap: 2px;
            `]: true,
          }}
        >
          <ButtonWithLabel
            type="button"
            activated={engineState.playing}
            onClick={togglePlay}
            labelOnButton={true}
            activatedColor={'#46d323'}
            blinkInterval={engineState.playing ? 60 / engineState.bpm : 0}
            label={'▶'}
          />

          <ButtonWithLabel
            type="button"
            activated={metronomeEnabled()}
            onClick={toggleMetronome}
            labelOnButton={true}
            activatedColor={'#46d323'}
            blinkInterval={
              metronomeEnabled() && engineState.playing
                ? 60 / engineState.bpm
                : 0
            }
            label={'Click'}
          />

          <Show when={lastSaved()}>
            <span
              title="Your work is autosaved locally in this app"
              class={css`
                align-self: center;
                margin: 0 6px;
                font-size: 10px;
                color: #8a8;
                white-space: nowrap;
              `}
            >
              ● Autosaved
            </span>
          </Show>

          <Row
            classList={{
              [css`
                zoom: 0.6;
                align-items: center;
                label {
                  color: white;
                }
              `]: true,
            }}
          >
            <InputLCD
              value={currentPosition()}
              class={css`
                text-align: right;
                height: 22px;
              `}
              readOnly
              size={6}
            />
            <NumberInputWithArrowButtons
              label={'Tempo'}
              min={20}
              max={280}
              step={1}
              size={4}
              value={engineState.bpm}
              onChange={handleTempoChange}
            />
            <ButtonWithLabel
              type="button"
              label="Tap"
              labelOnButton={true}
              title="Tap to set the tempo"
              onClick={tapTempo}
            />
            <NumberInputWithArrowButtons
              label={'Swing'}
              min={0}
              max={1}
              step={0.1}
              size={4}
              value={engineState.swing}
              onChange={handleSwingChange}
            />
            <NumberInputWithArrowButtons
              label={'Count-in'}
              min={0}
              max={4}
              step={1}
              size={3}
              value={countInBars()}
              onChange={handleCountInChange}
            />
            <label
              class={css`
                display: flex;
                flex-direction: column;
                align-items: center;
                font-size: 12px;
                margin: 0 4px;
              `}
              title="Global launch quantization — when a pattern's play button is pressed during playback, it starts at the next boundary of this grid (like Ableton's transport cue)."
            >
              Cue
              <select
                class={css`
                  height: 22px;
                  font-size: 14px;
                  margin-top: 2px;
                `}
                value={engineState.launchQuantization}
                onChange={(event) =>
                  props.engine.setLaunchQuantization(
                    event.currentTarget.value as LaunchQuantization,
                  )
                }
              >
                <For each={LAUNCH_QUANTIZATIONS}>
                  {(quantization) => (
                    <option value={quantization}>
                      {LAUNCH_QUANTIZATION_LABELS[quantization]}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <NumberInputWithArrowButtons
              label={'Zoom'}
              min={0.25}
              max={2}
              step={0.05}
              size={3}
              value={engineState.zoom}
              onChange={(zoom) => {
                props.engine.set({ zoom });
              }}
            />
          </Row>
          <ButtonWithLabel
            onClick={() => {
              const collapsed = !minimized();

              props.engine.tracks.forEach((track) => {
                track.set({ collapsed });
                track.chain.devices.forEach((device) => {
                  device.set({ collapsed });
                  if (device instanceof SamplerDevice) {
                    device.slices.forEach((slice) => {
                      slice.set({ collapsed });
                    });
                  }
                  if (device instanceof DeviceChain) {
                    device.devices.forEach((device) => {
                      device.set({ collapsed });
                    });
                  }
                });
              });

              setMinimized(collapsed);
            }}
            labelOnButton={true}
            label={minimized() ? 'Maximize' : 'Minimize'}
          />
          <RangeInput
            min={0}
            max={110}
            value={engineState.volume * 100}
            onChange={(volume) => {
              props.engine.set({ volume: volume / 100 });
            }}
            label="Master Volume"
          />
          <MasterMeter engine={props.engine} />
          <MidiControls engine={props.engine} />
          <ChannelSwitcher />
          <AccountMenu />
        </Row>
      </div>
    </div>
  );
};
