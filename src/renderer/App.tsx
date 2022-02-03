import { createSignal, onMount, createEffect, onCleanup, For } from 'solid-js';
import { Offline, Transport } from 'tone';
import { debounce } from 'ts-debounce';
import bufferToWav from 'audiobuffer-to-wav';

import './App.css';
import { Engine } from './engine/Engine';
import { Sampler } from './engine/Sampler';

import { VideoPlayer } from './VideoPlayer';
import { Pattern, Slice } from './Slice';
import { Step } from './SequencerStep';

const engine = new Engine(Transport);

const normalizeStepData = (step: Partial<Step>): Step => ({
  actions: Array.isArray(step.actions) ? step.actions : [],
});

const normalizePatternData = (pattern: Partial<Pattern> | Step[]): Pattern => ({
  subdivision: Array.isArray(pattern) ? 16 : pattern.subdivision ?? 16,
  subdivisionType: Array.isArray(pattern)
    ? 'n'
    : pattern.subdivisionType ?? 'n',
  steps: (Array.isArray(pattern)
    ? pattern
    : Array.isArray(pattern.steps)
    ? pattern.steps
    : []
  ).map(normalizeStepData),
});

const normaliizeSliceData = (slice: Partial<Slice>): Slice => ({
  id: slice.id ?? Math.random().toString(),
  color: slice.color ?? 'red',
  start: slice.start ?? 0,
  end: slice.end ?? 10,
  playbackSpeed: slice.playbackSpeed ?? 1,
  reverse: slice.reverse ?? false,
  volume: slice.volume ?? 1,
  patterns: (Array.isArray(slice.patterns) ? slice.patterns : []).map(
    normalizePatternData
  ),
});

const normalizeSamplerData = (
  sampler: Partial<ReturnType<Sampler['serialize']>>
): ReturnType<Sampler['serialize']> => ({
  url: sampler.url ?? '',
  volume: sampler.volume ?? 1,
  zoom: sampler.zoom ?? 0,
  slices: (Array.isArray(sampler.slices) ? sampler.slices : []).map(
    normaliizeSliceData
  ),
});

const normalizeData = (
  parsedData: Partial<ReturnType<Engine['serialize']>>
): ReturnType<Engine['serialize']> => {
  return {
    bpm: parsedData.bpm ?? 120,
    swing: parsedData.swing ?? 0,
    currentPatternIndex: parsedData.currentPatternIndex ?? 0,
    samplers: (Array.isArray(parsedData.samplers)
      ? parsedData.samplers
      : []
    ).map(normalizeSamplerData),
  };
};

export function App() {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [bpm, setBpm] = createSignal(engine.bpm);
  const [swing, setSwing] = createSignal(engine.swing);
  const [samplers, setSamplers] = createSignal<Sampler[]>([]);
  const [currentPatternIndex, setCurrentPatternIndex] = createSignal(
    engine.currentPatternIndex
  );

  const togglePlay = () => {
    setIsPlaying(!isPlaying());
  };

  const handleTempoChange = (event: { currentTarget: HTMLInputElement }) => {
    engine.setBpm(+event.currentTarget.value);
  };

  const handleSwingChange = (event: { currentTarget: HTMLInputElement }) => {
    engine.setSwing(+event.currentTarget.value);
  };

  const handleSamplerChanged = () => {
    setSamplers(engine.getSamplers());
  };

  const handleCurrentPatternIndexChange = (event: {
    currentTarget: HTMLInputElement;
  }) => {
    engine.setCurrentPatternIndex(event.currentTarget.valueAsNumber);
  };

  const saveToLocalStorage = debounce(() => {
    localStorage.setItem('track', JSON.stringify(engine.serialize()));
  }, 500);

  const exportJSON = () => {
    const json = JSON.stringify(engine.serialize(), undefined, 2);

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
          const parsedData = JSON.parse(fileContents);

          engine.dispose();
          engine.load(normalizeData(parsedData));
        } catch {
          //
        }
      });
      reader.readAsText(file);
    }
  };

  const renderToWavefile = async () => {
    const maxLength =
      engine
        .getSamplers()
        .flatMap((sampler) => {
          return sampler
            .getChains()
            .map(
              (chain) =>
                chain.getSlice().patterns[engine.currentPatternIndex].steps
                  .length
            );
        })
        .sort()
        .pop() ?? 16;

    const timeToRender = (maxLength * 4) / 8;

    let offlineEngine: Engine | null = null;

    const buffer = await Offline(async (offlineContext) => {
      offlineEngine = new Engine(offlineContext.transport);
      offlineEngine.load(engine.serialize());

      await Promise.all(
        offlineEngine.getSamplers().map((sampler) => sampler.hasLoaded())
      );

      offlineContext.transport.start();
    }, timeToRender);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    offlineEngine!.dispose();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const wav = bufferToWav(buffer.get()!);
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

  const addSampler = (event: { currentTarget: HTMLInputElement }) => {
    engine.createSampler({
      url: event.currentTarget.value,
      zoom: 0,
      slices: [],
    });
  };

  const clear = () => {
    engine.dispose();
  };

  onMount(() => {
    engine.on('sampler-added', handleSamplerChanged);
    engine.on('sampler-removed', handleSamplerChanged);
    engine.on('change', saveToLocalStorage);
    engine.on('bpm-updated', setBpm);
    engine.on('swing-updated', setSwing);
    engine.on('current-pattern-index-updated', setCurrentPatternIndex);
  });

  onCleanup(() => {
    engine.off('sampler-added', handleSamplerChanged);
    engine.off('sampler-removed', handleSamplerChanged);
    engine.off('change', saveToLocalStorage);
    engine.off('bpm-updated', setBpm);
    engine.off('swing-updated', setSwing);
    engine.off('current-pattern-index-updated', setCurrentPatternIndex);
  });

  onMount(() => {
    let parsedData;
    const storedDataString = localStorage.getItem(`track`);

    if (storedDataString) {
      try {
        parsedData = JSON.parse(storedDataString);
      } catch {
        //
      }
    }

    engine.load(
      normalizeData(
        parsedData ?? {
          samplers: [
            { url: 'https://www.youtube.com/watch?v=GxZuq57_bYM' },
            { url: 'https://www.youtube.com/watch?v=0-fJLVH8_Es' },
          ],
          currentPatternIndex: 0,
        }
      )
    );
  });

  createEffect(() => {
    if (isPlaying()) {
      Transport.start();
      engine.start();
    } else {
      Transport.stop();
    }
  });

  return (
    <div class="App">
      <div class="main-controls">
        <button type="button" onClick={togglePlay}>
          {isPlaying() ? 'Stop' : 'Play'}
        </button>
        Tempo:
        <input
          type="number"
          min="20"
          max="280"
          value={bpm()}
          onChange={handleTempoChange}
        />
        Swing:
        <input
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={swing()}
          onChange={handleSwingChange}
        />
        Pattern:
        <input
          type="number"
          min="0"
          step="1"
          value={currentPatternIndex()}
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
      <For each={samplers()}>
        {(sampler) => <VideoPlayer sampler={sampler} />}
      </For>
    </div>
  );
}
