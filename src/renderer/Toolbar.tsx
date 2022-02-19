import { createEffect, createSignal, For, onCleanup, onMount } from 'solid-js';
import { css } from 'renderer/emotion-solid';
import { Transport, start } from 'tone';
import { debounce } from 'ts-debounce';

import { createStoreFromEventEmitter } from './createSignalFromEventEmitter';

import { Engine } from './engine/Engine';
import { FindSlicesButton } from './FindSlicesButton';
import { LoginModal } from './LoginModal';
import { DeepPartial } from './engine/types';
import { Track } from './engine/Track';
import {
  ButtonGroup,
  ButtonWithLabel,
  InputLCD,
  LoadFileButton,
  NumberInputWithArrowButtons,
} from './UI';
import { Row } from './Grid';
import { exportBuffer } from './engine/helpers';
import { SamplerDevice } from './engine/device/Sampler';

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

  const engineState = createStoreFromEventEmitter(
    () => props.engine,
    [
      'bpmUpdated',
      'swingUpdated',
      'currentPatternIndexUpdated',
      'viewModeUpdated',
      'zoomUpdated',
    ],
    (engine) => ({
      bpm: engine.transport.bpm.value,
      viewMode: engine.viewMode,
      swing: engine.transport.swing,
      currentPatternIndex: engine.currentPatternIndex,
      zoom: engine.zoom,
    })
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

  const addSampler = (event: { currentTarget: HTMLInputElement }) => {
    props.engine.createTrack(
      Track.normalizeData({
        chain: {
          name: 'DeviceChain',
          devices: [{ name: 'Sampler', url: event.currentTarget.value }],
        },
      })
    );
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

  const renderToWavefile = async () => {
    const timeToRender = (props.engine.getMaxSequenceLength() * 4) / 8;
    const buffer = await props.engine.renderToBuffer(timeToRender);

    exportBuffer(buffer, 'audio.wav');
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
          <LoadFileButton label={'Load'} onChange={loadJSON} accept=".json" />
          <ButtonWithLabel
            onClick={exportJSON}
            labelOnButton={true}
            label={'Save'}
          />
          <ButtonWithLabel
            onClick={renderToWavefile}
            labelOnButton={true}
            label={'Mixdown'}
          />
          <ButtonWithLabel
            type="button"
            activated={isPlaying()}
            onClick={togglePlay}
            labelOnButton={true}
            label={'Play'}
          />
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
                });
              });

              setMinimized(collapsed);
            }}
            labelOnButton={true}
            label={minimized() ? 'Maximize' : 'Minimize'}
          />
          :
          <NumberInputWithArrowButtons
            min={20}
            max={280}
            step={1}
            size={4}
            value={engineState.bpm}
            onChange={handleTempoChange}
          />
          <ButtonGroup>
            <For
              each={
                Object.keys(
                  props.engine.viewMode
                ) as (keyof typeof props.engine.viewMode)[]
              }
            >
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
          <NumberInputWithArrowButtons
            min={0}
            max={1}
            step={0.1}
            size={4}
            value={engineState.swing}
            onChange={handleSwingChange}
          />
          <ButtonWithLabel
            onClick={clear}
            labelOnButton={true}
            label={'Clear all'}
          />
          <FindSlicesButton engine={props.engine} />
          Add video: <InputLCD onInput={addSampler} />
          Pattern:
          <NumberInputWithArrowButtons
            min={0}
            size={3}
            value={engineState.currentPatternIndex}
            onChange={(currentPatternIndex) =>
              props.engine.set({ currentPatternIndex })
            }
          />
          Zoom:
          <input
            type="range"
            min="0.25"
            max={2}
            step="0.05"
            value={engineState.zoom}
            onInput={(event) => {
              props.engine.set({ zoom: event.currentTarget.valueAsNumber });
            }}
          />
        </Row>
      </div>
    </div>
  );
};
