/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { css } from '@emotion/css';
import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { Regions, Waveform } from 'solid-waveform';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column, Row } from '../UI/Grid';
import { LCDFrame, LCDLabel, LCDLine } from '../UI/LCD';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { formatTime } from '../UI/format';
import { LCD } from '../UI/lcdStyles';
import type { Engine } from '../engine/Engine';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { SamplerDevice } from '../engine/device/Sampler';
import { Slice } from '../engine/device/Slice';

// The always-visible "classic sampler" at the top of the app: cover/title of
// the current slot on the left, a waveform sample-selector in the middle, and
// browse (◀/▶) + audition controls. Each added YouTube video is a new slot.
export const SamplerPanel = (props: { engine: Engine }) => {
  const currentSampler = createSignalFromEventEmitter(
    props.engine,
    (engine) => engine.currentSampler,
    'currentSamplerChanged',
  );

  const sampleCount = createSignalFromEventEmitter(
    props.engine,
    (engine) => engine.samplers.length,
    ['samplersUpdated', 'currentSamplerChanged'],
  );

  return (
    <div
      class={css`
        margin: 6px 10px 0;
      `}
    >
      <LCDFrame>
        <LCD>
          <LCDLine
            class={css`
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 8px;
            `}
          >
            <span>Sampler</span>
            <span
              class={css`
                display: flex;
                gap: 4px;
                align-items: center;
              `}
            >
              <ButtonWithLabel
                label="◀"
                labelOnButton
                onClick={() => props.engine.selectPreviousSample()}
              />
              <span
                class={css`
                  min-width: 44px;
                  text-align: center;
                `}
              >
                {sampleCount() ? props.engine.currentSamplerIndex + 1 : 0}/
                {sampleCount()}
              </span>
              <ButtonWithLabel
                label="▶"
                labelOnButton
                onClick={() => props.engine.selectNextSample()}
              />
            </span>
          </LCDLine>

          <Show
            when={currentSampler()}
            fallback={
              <LCDLine
                class={css`
                  opacity: 0.7;
                `}
              >
                Add a YouTube video from the panel on the left to create a
                sample.
              </LCDLine>
            }
            keyed
          >
            {(sampler) => (
              <SamplerSlotView sampler={sampler} engine={props.engine} />
            )}
          </Show>
        </LCD>
      </LCDFrame>
    </div>
  );
};

const SamplerSlotView = (props: { sampler: SamplerDevice; engine: Engine }) => {
  const state = createStoreFromEventEmitter(
    () => props.sampler,
    (sampler) => sampler.serialize(),
    'change',
  );

  // Vertical waveform amplitude scale (shift+wheel), local view state only.
  const [scale, setScale] = createSignal(1);
  const [chopCount, setChopCount] = createSignal(8);

  const [buffer, setBuffer] = createSignal<AudioBuffer | undefined>();
  createEffect(() => {
    // Re-run when the bound slot changes.
    const sampler = props.sampler;
    void (async () => {
      await sampler.hasLoaded();
      if (props.sampler === sampler) setBuffer(sampler.buffer.get());
    })();
  });

  const duration = () => buffer()?.duration ?? 0;
  const selectionEnd = () => (state.end > state.start ? state.end : duration());

  const setSelection = (start: number, end: number) =>
    props.sampler.set({
      start: Math.max(0, start),
      end: Math.min(end, duration() || end),
    });

  // Turn the current slot into N equal slots — the chop workflow, now producing
  // sample slots (each independently selectable from a sequencer's dropdown).
  const chopIntoSlots = () => {
    const total = duration();
    if (!total) return;
    const count = Math.max(1, Math.min(64, Math.round(chopCount())));
    for (let i = 0; i < count; i++) {
      props.engine.createSample({
        url: props.sampler.url,
        title: `${props.sampler.title || 'Chop'} ${i + 1}`,
        cover: props.sampler.cover,
        rootNote: props.sampler.rootNote,
        start: (i * total) / count,
        end: ((i + 1) * total) / count,
      });
    }
  };

  // Create a sequencer track that plays the current selection. (Until the
  // per-sequencer sample dropdown lands, this is how a prepared slot is wired
  // up to make sound.)
  const addToSequencer = () =>
    props.engine.createSliceTrack(
      Slice.normalizeData({
        url: props.sampler.url,
        title: props.sampler.title,
        color: state.color,
        start: state.start,
        end: selectionEnd(),
        pitch: state.rootNote,
      }),
    );

  return (
    <Row
      class={css`
        gap: 10px;
        align-items: stretch;
        padding-top: 6px;
      `}
    >
      <Column
        class={css`
          width: 140px;
          flex-shrink: 0;
          gap: 4px;
        `}
      >
        <Cover url={state.cover} />
        <div
          class={css`
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          title={state.title || state.url}
        >
          {state.title || state.url}
        </div>
        <Row
          class={css`
            gap: 4px;
            flex-wrap: wrap;
          `}
        >
          <ButtonWithLabel
            label="▶ Audition"
            labelOnButton
            onClick={() => props.sampler.audition()}
          />
          <ButtonWithLabel
            label="◼"
            labelOnButton
            onClick={() => props.sampler.stopAudition()}
          />
        </Row>
        <Row
          class={css`
            gap: 4px;
            flex-wrap: wrap;
          `}
        >
          <ButtonWithLabel
            label="＋ Sequencer"
            labelOnButton
            onClick={addToSequencer}
          />
          <ButtonWithLabel
            label="🗑"
            labelOnButton
            onClick={() => props.engine.removeSample(props.sampler)}
          />
        </Row>
      </Column>

      <Column
        class={css`
          flex: 1;
          gap: 4px;
          min-width: 0;
        `}
      >
        <Row
          class={css`
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          `}
        >
          <span
            class={css`
              display: flex;
              align-items: center;
              gap: 4px;
            `}
          >
            <LCDLabel>Root</LCDLabel>
            <NumberInputWithArrowButtons
              value={state.rootNote}
              min={-24}
              max={24}
              step={1}
              onChange={(rootNote) => props.sampler.set({ rootNote })}
            />
          </span>
          <span
            class={css`
              display: flex;
              align-items: center;
              gap: 4px;
            `}
          >
            <LCDLabel>Zoom</LCDLabel>
            <NumberInputWithArrowButtons
              value={state.zoom}
              onChange={(zoom) => props.sampler.set({ zoom })}
              parse={(value) => Math.round(parseFloat(value)) / 100}
              format={(value) => Math.round(value * 100).toString()}
            />
          </span>
          <span
            class={css`
              display: flex;
              align-items: center;
              gap: 4px;
            `}
          >
            <LCDLabel>Chop</LCDLabel>
            <NumberInputWithArrowButtons
              value={chopCount()}
              min={1}
              max={64}
              step={1}
              onChange={setChopCount}
            />
            <ButtonWithLabel
              label="Chop"
              labelOnButton
              onClick={chopIntoSlots}
            />
          </span>
          <span>
            {formatTime(state.start)}s – {formatTime(selectionEnd())}s
          </span>
        </Row>

        <Waveform
          buffer={buffer()}
          zoom={state.zoom}
          position={state.position}
          scale={scale()}
          onZoomChange={(zoom) => props.sampler.set({ zoom })}
          onPositionChange={(position) => props.sampler.set({ position })}
          onScaleChange={setScale}
          class={css`
            width: 100%;
            height: 150px;
          `}
        >
          <Regions
            regions={[
              {
                id: 'selection',
                color: state.color || 'rgba(255,145,0,0.4)',
                start: state.start,
                end: selectionEnd(),
              },
            ]}
            onCreateRegion={(region) => setSelection(region.start, region.end)}
            onUpdateRegion={(region) => setSelection(region.start, region.end)}
            onClickRegion={() => props.sampler.audition()}
          />
        </Waveform>
      </Column>
    </Row>
  );
};

// YouTube covers live on Google CDNs that CORS/CSP block from the renderer, so
// fetch them through the main-process image proxy (returns a data: URL). Falls
// back to the raw URL in the browser-only build (no bridge).
const Cover = (props: { url: string }) => {
  const [src] = createResource(
    () => props.url,
    async (url) => {
      if (!url || url.startsWith('data:')) return url;
      const fetchImage = window.media?.fetchImage;
      if (!fetchImage) return url;
      try {
        return (await fetchImage(url)) || '';
      } catch {
        return '';
      }
    },
  );

  return (
    <div
      class={css`
        width: 140px;
        height: 78px;
        border-radius: 4px;
        background: #222;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      `}
    >
      <Show
        when={src()}
        fallback={
          <span
            class={css`
              opacity: 0.5;
              font-size: 11px;
            `}
          >
            no cover
          </span>
        }
      >
        <img
          src={src()}
          alt=""
          class={css`
            width: 100%;
            height: 100%;
            object-fit: cover;
          `}
        />
      </Show>
    </div>
  );
};
