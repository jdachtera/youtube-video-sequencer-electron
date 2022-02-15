import audioBufferToWav from 'audiobuffer-to-wav';
import { createEffect, createSignal, For, onCleanup, onMount } from 'solid-js';
import { css } from 'solid-styled-components';
import { Offline, Transport } from 'tone';
import { debounce } from 'ts-debounce';

import { createStoreFromEventEmitter } from './createSignalFromEventEmitter';
import { Sampler } from './engine/device/Sampler';
import { Engine } from './engine/Engine';
import { DeepPartial, normalizeData } from './engine/normalizeData';
import { FindSlicesButton } from './FindSlicesButton';
import { MoogKnobWithLabel } from './controls/Knob';
import { LoginModal } from './LoginModal';

const viewModes = ['DEVICE', 'PATTERN'] as const;
export type ViewMode = typeof viewModes[number];
export const Toolbar = (props: {
  engine: Engine;
  viewMode: ViewMode;
  onViewModeChanged: (viewMode: ViewMode) => void;
}) => {
  const [isPlaying, setIsPlaying] = createSignal(false);

  const engineState = createStoreFromEventEmitter(
    () => props.engine,
    ['bpmUpdated', 'swingUpdated', 'currentPatternIndexUpdated'],
    (engine) => ({
      bpm: engine.transport.bpm.value,
      swing: engine.transport.swing,
      currentPatternIndex: engine.currentPatternIndex,
    })
  );

  const togglePlay = () => {
    setIsPlaying(!isPlaying());
  };

  const handleTempoChange = (bpm: number) => {
    props.engine.set({ bpm });
  };

  const handleSwingChange = (swing: number) => {
    props.engine.set({ swing });
  };

  const addSampler = (event: { currentTarget: HTMLInputElement }) => {
    props.engine.createTrack({
      chain: {
        name: 'DeviceChain',
        inputGain: 1,
        volume: 1,
        devices: [
          {
            name: 'Sampler',
            inputGain: 1,
            volume: 1,
            url: event.currentTarget.value,
            zoom: 0,
            slices: [],
          },
        ],
      },
    });
  };

  const clear = () => {
    props.engine.dispose();
  };

  const handleCurrentPatternIndexChange = (event: {
    currentTarget: HTMLInputElement;
  }) => {
    props.engine.set({
      currentPatternIndex: event.currentTarget.valueAsNumber,
    });
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

          props.engine.set(normalizeData(parsedData));
        } catch {
          //
        }
      });
      reader.readAsText(file);
    }
  };

  const renderToWavefile = async () => {
    const maxLength =
      props.engine.tracks
        .flatMap((track) =>
          track.chain.devices
            .filter((device): device is Sampler => device instanceof Sampler)
            .flatMap((sampler) =>
              sampler
                .getSlices()
                .map(
                  (slice) =>
                    slice.serialize().patterns[props.engine.currentPatternIndex]
                      .steps.length
                )
            )
        )
        .sort()
        .pop() ?? 16;

    const timeToRender = (maxLength * 4) / 8;

    let offlineEngine: Engine | null = null;

    const buffer = await Offline(async (offlineContext) => {
      offlineEngine = new Engine(offlineContext.transport);
      offlineEngine.set(props.engine.serialize());

      await offlineEngine.hasLoaded();

      offlineContext.transport.start();
    }, timeToRender);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    offlineEngine!.dispose();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const wav = audioBufferToWav(buffer.get()!);
    const blob = new window.Blob([new DataView(wav)], {
      type: 'audio/wav',
    });

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'audio.wav';
    anchor.click();
    window.URL.revokeObjectURL(url);
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
      normalizeData(
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
      Transport.start();
      props.engine.start();
    } else {
      Transport.stop();
    }
  });

  return (
    <div>
      <LoginModal />
      <FindSlicesButton engine={props.engine} />
      <div
        class={css`
          background: #333;
          padding: 8px;
        `}
      >
        <button type="button" onClick={togglePlay}>
          {isPlaying() ? 'Stop' : 'Play'}
        </button>
        :
        <MoogKnobWithLabel
          label="Tempo"
          min={20}
          max={280}
          step={1}
          value={engineState.bpm}
          onChange={handleTempoChange}
        />
        <select
          onChange={(event) =>
            props.onViewModeChanged(event.currentTarget.value as ViewMode)
          }
        >
          <For each={viewModes}>
            {(viewMode) => <option value={viewMode}>{viewMode}</option>}
          </For>
        </select>
        <MoogKnobWithLabel
          label="Swing"
          min={0}
          max={1}
          value={engineState.swing}
          onChange={handleSwingChange}
        />
        Pattern:
        <input
          type="number"
          min="0"
          step="1"
          value={engineState.currentPatternIndex}
          onChange={handleCurrentPatternIndexChange}
        />
        <input type="text" onInput={addSampler} />
      </div>
      <button type="button" onClick={renderToWavefile}>
        Download WAV
      </button>
      <button type="button" onClick={exportJSON}>
        Export JSON
      </button>
      <button type="button" onClick={clear}>
        Clear all
      </button>
      Load JSON: <input type="file" onChange={loadJSON} accept=".json" />
    </div>
  );
};
