import { createSignal, onMount, createEffect, onCleanup, For } from 'solid-js';
import { Offline, Time, Transport } from 'tone';
import { debounce } from 'ts-debounce';
import bufferToWav from 'audiobuffer-to-wav';

import './App.css';
import { Engine } from './engine/Engine';
import { Sampler } from './engine/Sampler';

import { VideoPlayer } from './VideoPlayer';

const engine = new Engine(Transport);

export function App() {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [bpm, setBpm] = createSignal(engine.bpm);
  const [swing, setSwing] = createSignal(engine.swing);
  const [samplers, setSamplers] = createSignal<Sampler[]>([]);

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
          engine.load(parsedData);
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
                chain.getSlice().patterns[engine.currentPatternIndex].length
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

    offlineEngine!.dispose();

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

  onMount(() => {
    engine.on('sampler-added', handleSamplerChanged);
    engine.on('sampler-removed', handleSamplerChanged);
    engine.on('change', saveToLocalStorage);
    engine.on('bpm-updated', setBpm);
    engine.on('swing-updated', setSwing);
  });

  onCleanup(() => {
    engine.off('sampler-added', handleSamplerChanged);
    engine.off('sampler-removed', handleSamplerChanged);
    engine.off('change', saveToLocalStorage);
    engine.off('bpm-updated', setBpm);
    engine.off('swing-updated', setSwing);
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
      parsedData ?? {
        samplers: [
          { url: 'https://www.youtube.com/watch?v=GxZuq57_bYM' },
          { url: 'https://www.youtube.com/watch?v=0-fJLVH8_Es' },
        ],
        currentPatternIndex: 0,
      }
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
    <div className="App">
      <div className="main-controls">
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
        <input type="text" onInput={addSampler} />
      </div>
      <button type="button" onClick={renderToWavefile}>
        Download WAV
      </button>
      <button type="button" onClick={exportJSON}>
        Export JSON
      </button>
      Load JSON: <input type="file" onChange={loadJSON} accept=".json" />
      <For each={samplers()}>
        {(sampler) => <VideoPlayer sampler={sampler} />}
      </For>
    </div>
  );
}
