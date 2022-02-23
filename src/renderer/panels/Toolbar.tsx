import { createEffect, createSignal, For, onCleanup, onMount } from 'solid-js';
import { css } from '../emotion-solid';
import { Transport, start } from 'tone';
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

const camelCaseToSpaced = (str: string) => {
  let newString = '';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === str[i].toUpperCase()) {
      newString += ' ';
    }
    newString += str[i].toLowerCase();
  }
  return newString;
};
export const Toolbar = (props: { engine: Engine }) => {
  const [isPlaying, setIsPlaying] = createSignal(false);

  const engineState = props.engine.createStore(
    (engine) => ({
      bpm: engine.transport.bpm.value,
      viewMode: engine.viewMode,
      swing: engine.transport.swing,
      currentPatternIndex: engine.currentPatternIndex,
      zoom: engine.zoom,
    }),
    [
      'bpmUpdated',
      'swingUpdated',
      'currentPatternIndexUpdated',
      'viewModeUpdated',
      'zoomUpdated',
    ]
  );

  const togglePlay = async () => {
    setIsPlaying(!isPlaying());
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

  const loadJSON = (event: { currentTarget: HTMLInputElement }) => {
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
        } catch {
          //
        }
      });
      reader.readAsText(file);
    }
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

    props.engine.set(
      Engine.normalizeData(
        parsedData ?? {
          tracks: [
            {
              chain: {
                devices: [
                  {
                    name: 'Sampler',
                    url: 'https://www.youtube.com/watch?v=GxZuq57_bYM',
                  },
                ],
              },
            },
            {
              chain: {
                devices: [
                  {
                    name: 'Sampler',
                    url: 'https://www.youtube.com/watch?v=0-fJLVH8_Es',
                  },
                ],
              },
            },
          ],
        }
      )
    );
  });

  createEffect(() => {
    if (isPlaying()) {
      start()
        .then(() => {
          Transport.start();
          props.engine.start();
          return;
        })
        .catch(console.error);
    } else {
      Transport.stop();
    }
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
            activated={isPlaying()}
            onClick={togglePlay}
            labelOnButton={true}
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
                label {
                  color: white;
                }
              `]: true,
            }}
          >
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
              label={'Pattern'}
              min={0}
              size={3}
              value={engineState.currentPatternIndex}
              onChange={(currentPatternIndex) =>
                props.engine.set({ currentPatternIndex })
              }
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
