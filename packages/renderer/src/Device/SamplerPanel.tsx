/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { css } from '@emotion/css';
import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { Regions, Waveform } from 'solid-waveform';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { Column, Row } from '../UI/Grid';
import { LCDFrame, LCDLabel, LCDLine } from '../UI/LCD';
import { NumberInputWithArrowButtons } from '../UI/NumberInputWithArrowButtons';
import { SelectWithArrowButtons } from '../UI/SelectWithArrowButtons';
import { formatTime } from '../UI/format';
import { LCD } from '../UI/lcdStyles';
import type { Engine } from '../engine/Engine';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { SamplerDevice } from '../engine/device/Sampler';
import { Slice } from '../engine/device/Slice';

const controlGroup = css`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const controlRow = css`
  display: flex;
  align-items: center;
  gap: 10px 14px;
  flex-wrap: wrap;
`;

// Faint inset panel that groups the slot's controls under the cover/waveform.
const controlsPanel = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.14);
  box-shadow: inset 0 0 1px rgba(0, 0, 0, 0.4);
`;

const slotTitle = css`
  font-weight: bold;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const coverFrame = css`
  width: 104px;
  height: 58px;
  border-radius: 4px;
  background: linear-gradient(145deg, #2b2b2b, #151515);
  border: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

// Whether the persisted project already has at least one track. Used to decide
// the sampler's initial collapsed state without waiting for the engine load.
const projectHasTracks = () => {
  try {
    const raw = localStorage.getItem('track');
    if (!raw) return false;
    const data = JSON.parse(raw) as { tracks?: unknown[] };
    return Array.isArray(data.tracks) && data.tracks.length > 0;
  } catch {
    return false;
  }
};

// The "classic sampler" at the top of the app: cover/title of the current slot
// on the left, a waveform sample-selector in the middle, and browse (◀/▶) +
// audition controls. Each added YouTube video is a new slot. Collapsible so the
// tracks below can take the vertical space.
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

  // Collapse to just the header so the tracks below get the vertical space —
  // important once a project has many tracks. Start collapsed when the project
  // already has tracks (you're arranging — expand to edit a sample); start open
  // for an empty project so the "add a sample" hint guides a first-time setup.
  // Read straight from the persisted project (synchronous, available at mount;
  // the engine's own load runs later in the Toolbar).
  const [collapsed, setCollapsed] = createSignal(projectHasTracks());

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
            <span
              class={css`
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 0;
              `}
            >
              <ButtonWithLabel
                label={collapsed() ? '▸' : '▾'}
                labelOnButton
                onClick={() => setCollapsed((value) => !value)}
              />
              <span>Sampler</span>
              <Show when={collapsed()}>
                <span
                  class={css`
                    opacity: 0.75;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  `}
                >
                  — {currentSampler()?.title || currentSampler()?.url || '—'}
                </span>
              </Show>
            </span>
            <span
              class={css`
                display: flex;
                gap: 4px;
                align-items: center;
                flex-shrink: 0;
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

          <Show when={!collapsed()}>
            <Show
              when={currentSampler()}
              fallback={
                <LCDLine
                  class={css`
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 22px 0;
                    text-align: center;
                    opacity: 0.7;
                  `}
                >
                  <span
                    class={css`
                      font-size: 30px;
                      opacity: 0.5;
                    `}
                  >
                    ♪
                  </span>
                  <span>
                    Add a YouTube video from the panel on the left to create a
                    sample.
                  </span>
                </LCDLine>
              }
              keyed
            >
              {(sampler) => (
                <SamplerSlotView sampler={sampler} engine={props.engine} />
              )}
            </Show>
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

  const cloneSlot = () => props.engine.cloneSample(props.sampler);

  const deleteSlot = () => {
    const count = props.engine.tracksUsingSample(props.sampler).length;
    if (
      count > 0 &&
      !confirm(
        `This sample is used by ${count} sequencer track${
          count > 1 ? 's' : ''
        }, which will be removed too. Delete it?`,
      )
    ) {
      return;
    }
    props.engine.removeSample(props.sampler);
  };

  // Create a sequencer track whose voice is bound to this prepared slot. The
  // voice derives its source/region/root note from the slot, and the
  // sequencer's sample dropdown can repoint it later.
  const addToSequencer = () =>
    props.engine.createSliceTrack(
      Slice.normalizeData({
        samplerId: props.sampler.id,
        title: props.sampler.title,
        color: state.color,
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
          width: 104px;
          flex-shrink: 0;
          gap: 4px;
        `}
      >
        <Cover url={state.cover} />
        <div class={slotTitle} title={state.title || state.url}>
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
          <ButtonWithLabel label="⧉ Clone" labelOnButton onClick={cloneSlot} />
          <ButtonWithLabel label="🗑" labelOnButton onClick={deleteSlot} />
        </Row>
      </Column>

      <Column
        class={css`
          flex: 1;
          gap: 4px;
          min-width: 0;
        `}
      >
        <div class={controlsPanel}>
          <Row class={controlRow}>
            <span class={controlGroup}>
              <LCDLabel>Root</LCDLabel>
              <NumberInputWithArrowButtons
                value={state.rootNote}
                min={-24}
                max={24}
                step={1}
                onChange={(rootNote) => props.sampler.set({ rootNote })}
              />
            </span>
            <span class={controlGroup}>
              <LCDLabel>Zoom</LCDLabel>
              <NumberInputWithArrowButtons
                value={state.zoom}
                onChange={(zoom) => props.sampler.set({ zoom })}
                parse={(value) => Math.round(parseFloat(value)) / 100}
                format={(value) => Math.round(value * 100).toString()}
              />
            </span>
            <span class={controlGroup}>
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
            <span
              class={css`
                margin-left: auto;
                opacity: 0.85;
              `}
            >
              {formatTime(state.start)}s – {formatTime(selectionEnd())}s
            </span>
          </Row>

          {/* Sound-shaping — these define the slot's sound; every voice that plays
            it follows. Clone the slot for a different variation. */}
          <Row class={controlRow}>
            <span class={controlGroup}>
              <LCDLabel>Vol</LCDLabel>
              <NumberInputWithArrowButtons
                value={state.volume}
                min={0}
                max={3}
                step={0.01}
                onChange={(volume) => props.sampler.set({ volume })}
              />
            </span>
            <span class={controlGroup}>
              <LCDLabel>Speed</LCDLabel>
              <NumberInputWithArrowButtons
                value={state.playbackRate}
                min={0}
                max={4}
                step={0.01}
                onChange={(playbackRate) => props.sampler.set({ playbackRate })}
              />
            </span>
            <span class={controlGroup}>
              <LCDLabel>Warp</LCDLabel>
              <SelectWithArrowButtons
                options={['resample', 'stretch'] as ('resample' | 'stretch')[]}
                size={9}
                selectedOption={state.warpmode}
                onChange={(warpmode) => props.sampler.set({ warpmode })}
              />
            </span>
            <ButtonWithLabel
              label="Reverse"
              labelOnButton
              activated={state.reverse}
              onClick={() => props.sampler.set({ reverse: !state.reverse })}
            />
            <Show when={state.warpmode === 'stretch'}>
              <span class={controlGroup}>
                <LCDLabel>Grain</LCDLabel>
                <NumberInputWithArrowButtons
                  value={state.grainSize}
                  min={0.001}
                  max={1}
                  step={0.001}
                  onChange={(grainSize) => props.sampler.set({ grainSize })}
                />
              </span>
            </Show>
          </Row>
        </div>

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
            height: 82px;
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
    <div class={coverFrame}>
      <Show
        when={src()}
        fallback={
          <span
            class={css`
              opacity: 0.3;
              font-size: 30px;
              line-height: 1;
            `}
          >
            ♪
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
