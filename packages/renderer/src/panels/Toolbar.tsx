import { css } from '@emotion/css';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Time } from 'tone';
import { debounce } from 'ts-debounce';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Row } from '../UI/Grid';
import { MasterMeter } from '../UI/MasterMeter';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { RangeInput } from '../UI/RangeInput';
import { InputLCD } from '../UI/lcdStyles';
import { Engine } from '../engine/Engine';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import { DeviceChain } from '../engine/device/DeviceChain';
import { SamplerDevice } from '../engine/device/Sampler';
import type { DeepPartial } from '../engine/types';
import { AccountMenu } from './AccountMenu';
import { ChannelSwitcher } from './ChannelSwitcher';

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
    }),
    [
      'bpmUpdated',
      'swingUpdated',
      'viewModeUpdated',
      'zoomUpdated',
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

  const togglePlay = async () => {
    if (engineState.playing) {
      props.engine.stop();
    } else {
      props.engine.start();
    }
  };

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
          <ChannelSwitcher />
          <AccountMenu />
        </Row>
      </div>
    </div>
  );
};
