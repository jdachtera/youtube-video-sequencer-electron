import { createSignal, For, onCleanup, onMount } from 'solid-js';
import { css } from '../emotion-solid';
import { Time } from 'tone';
import { debounce } from 'ts-debounce';

import { Engine } from '../engine/Engine';
import { LoginModal } from './LoginModal';
import { DeepPartial } from '../engine/types';

import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { LoadFileButton } from '../UI/LoadFileButton';
import { ButtonGroup } from '../UI/ButtonGroup';
import { Row } from '../UI/Grid';
import { SamplerDevice } from '../engine/device/Sampler';
import { DeviceChain } from '../engine/device/DeviceChain';
import { MixdownButton } from './MixdownButton';
import { camelCaseToSpaced } from 'renderer/UI/format';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from 'renderer/engine/EngineBase';
import { InputLCD } from 'renderer/UI/lcdStyles';

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
    }),
    [
      'bpmUpdated',
      'swingUpdated',
      'viewModeUpdated',
      'zoomUpdated',
      'start',
      'stop',
    ]
  );

  const currentPosition = createSignalFromEventEmitter(
    () => props.engine,
    (engine) =>
      Time(engine.transport.position).toBarsBeatsSixteenths().split('.')[0],
    ['draw']
  );

  const togglePlay = async () => {
    if (engineState.playing) {
      props.engine.stop();
    } else {
      props.engine.start();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    switch (event.code) {
      case 'Space':
        togglePlay();
        break;
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

  const clear = () => {
    props.engine.dispose();
  };

  const saveToLocalStorage = debounce((engine: Engine) => {
    localStorage.setItem('track', JSON.stringify(engine.serialize()));
  }, 500);

  const exportJSON = () => {
    const json = JSON.stringify(props.engine.serialize(), undefined, 2);

    const blob = new window.Blob([json], {
      type: 'application/json',
    });

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'export.json';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const loadJSON = async (event: { currentTarget: HTMLInputElement }) => {
    await new Promise<void>((resolve) => {
      const file = event.currentTarget.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.addEventListener('load', (loadEvent) => {
          const fileContents = loadEvent.target?.result?.toString();

          if (!fileContents) return;
          try {
            const parsedData = JSON.parse(fileContents) as Partial<
              ReturnType<Engine['serialize']>
            >;

            props.engine.set(Engine.normalizeData(parsedData));
            resolve();
          } catch {
            //
          }
        });
        reader.readAsText(file);
      }
    });
  };

  onMount(() => props.engine.on('change', saveToLocalStorage));
  onCleanup(() => props.engine.off('change', saveToLocalStorage));

  onMount(() => {
    let parsedData: DeepPartial<ReturnType<Engine['serialize']>> | undefined;
    const storedDataString = localStorage.getItem(`track`);

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
      <LoginModal />

      <div
        class={css`
          background: #333;
          padding: 8px;
        `}
      >
        <Row>
          <ButtonWithLabel
            type="button"
            activated={engineState.playing}
            onClick={togglePlay}
            labelOnButton={true}
            activatedColor={'#46d323'}
            blinkInterval={engineState.playing ? 60 / engineState.bpm : 0}
            label={'▶'}
          />

          <ButtonGroup>
            <LoadFileButton label={'Load'} onChange={loadJSON} accept=".json" />
            <ButtonWithLabel
              onClick={exportJSON}
              labelOnButton={true}
              label={'Save'}
            />
            <MixdownButton engine={props.engine} />
            <ButtonWithLabel
              onClick={clear}
              labelOnButton={true}
              label={'Clear all'}
            />
          </ButtonGroup>

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
          <ButtonGroup>
            <ButtonWithLabel
              activated={engineState.viewMode.sidePanel.open ?? false}
              onClick={() => {
                props.engine.set({
                  viewMode: {
                    ...engineState.viewMode,
                    sidePanel: { open: !engineState.viewMode.sidePanel.open },
                  },
                });
              }}
              labelOnButton={true}
              label={'Browser'}
            />
            <For each={props.engine.viewModes}>
              {(viewMode) => (
                <ButtonWithLabel
                  activated={engineState.viewMode[viewMode]}
                  onClick={() => {
                    props.engine.set({
                      viewMode: {
                        ...engineState.viewMode,
                        [viewMode]: !engineState.viewMode[viewMode],
                      },
                    });
                  }}
                  labelOnButton={true}
                  label={camelCaseToSpaced(viewMode)}
                />
              )}
            </For>
          </ButtonGroup>
          <ButtonWithLabel
            onClick={() => {
              const collapsed = !minimized();

              props.engine.tracks.forEach((track) => {
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
        </Row>
      </div>
    </div>
  );
};
