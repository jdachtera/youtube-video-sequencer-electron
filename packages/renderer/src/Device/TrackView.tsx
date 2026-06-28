import { css } from '@emotion/css';
import type { Track } from 'engine/Track';
import { createSignal, Show } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { DeviceWrapper } from '../UI/DeviceWrapper';
import { Row } from '../UI/Grid';
import { ScreenPrintBackground } from '../UI/ScreenPrintBackground';
import { InputLCD } from '../UI/lcdStyles';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import { DeviceChainView } from './DeviceChainView';

export const TrackView = (props: { track: Track }) => {
  const trackState = createStoreFromEventEmitter(
    () => props.track,
    (track) => ({
      name: track.name,
      collapsed: track.collapsed,
      mute: track.volume.mute,
      solo: track.soloNode.solo,
      color: track.color,
      volume: track.volume.volume.value,
    }),
    [
      'colorUpdated',
      'nameUpdated',
      'soloUpdated',
      'muteUpdated',
      'collapsedUpdated',
      'volumeUpdated',
    ],
  );

  const viewMode = createStoreFromEventEmitter(
    () => props.track.engine,
    (engine) => engine.viewMode,
    'viewModeUpdated',
  );

  // Position of this track in the list, kept live so the move buttons disable at
  // the ends and act on the current order.
  const trackIndex = createSignalFromEventEmitter(
    () => props.track.engine,
    (engine) => engine.tracks.indexOf(props.track),
    ['trackAdded', 'trackRemoved', 'tracksReordered'],
  );
  const trackCount = createSignalFromEventEmitter(
    () => props.track.engine,
    (engine) => engine.tracks.length,
    ['trackAdded', 'trackRemoved'],
  );

  // Drag-and-drop reordering. Only the grip handle starts a drag; the whole
  // track row is the drop target (highlighted while a track is dragged over it).
  const DRAG_MIME = 'application/x-megarack-track-index';
  const [dragOver, setDragOver] = createSignal(false);

  const onGripDragStart = (event: DragEvent) => {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(DRAG_MIME, String(trackIndex()));
    event.dataTransfer.effectAllowed = 'move';
  };
  const onRowDragOver = (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes(DRAG_MIME)) return;
    event.preventDefault(); // allow the drop
    event.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };
  const onRowDrop = (event: DragEvent) => {
    const raw = event.dataTransfer?.getData(DRAG_MIME);
    setDragOver(false);
    if (!raw) return;
    event.preventDefault();
    const from = Number(raw);
    if (Number.isInteger(from))
      props.track.engine.moveTrack(from, trackIndex());
  };

  return (
    <Row
      classList={{ Track: true }}
      style={{
        'border-top': `2px solid ${dragOver() ? '#46d323' : 'transparent'}`,
      }}
      onDragOver={onRowDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onRowDrop}
    >
      <DeviceWrapper
        hidden={!viewMode.channel}
        onClickLeftRackEar={() =>
          props.track.set({ collapsed: !trackState.collapsed })
        }
        onClickRightRackEar={() => {
          if (!confirm('Really remove track?')) return;
          props.track.engine.removeTrack(props.track);
        }}
        background={trackState.color}
      >
        <ScreenPrintBackground background={'rgba(255,255,255,0.2)'}>
          <Row
            classList={{
              [css`
                flex: 1;
                align-items: center;
              `]: true,
            }}
          >
            <div
              draggable={true}
              onDragStart={onGripDragStart}
              title="Drag to reorder track"
              class={css`
                cursor: grab;
                user-select: none;
                padding: 0 4px;
                font-size: 16px;
                line-height: 1;
                color: rgba(0, 0, 0, 0.45);
                &:active {
                  cursor: grabbing;
                }
              `}
            >
              ⠿
            </div>
            <InputLCD
              classList={{
                [css`
                  width: 130px;
                  white-space: nowrap;
                  text-overflow: ellipsis;
                `]: true,
              }}
              value={trackState.name}
              onInput={(event) => {
                props.track.set({ name: event.currentTarget.value });
              }}
            />
            <ButtonWithLabel
              label="Solo"
              activated={trackState.solo}
              labelOnButton={true}
              onClick={(event) => {
                props.track.setSolo(!trackState.solo, event.altKey);
              }}
            />
            <ButtonWithLabel
              label="Mute"
              activated={trackState.mute}
              labelOnButton={true}
              onClick={() => {
                props.track.set({ mute: !trackState.mute });
              }}
            />
            <ButtonWithLabel
              label="▲"
              labelOnButton={true}
              title="Move track up"
              disabled={trackIndex() <= 0}
              onClick={() =>
                props.track.engine.moveTrack(trackIndex(), trackIndex() - 1)
              }
            />
            <ButtonWithLabel
              label="▼"
              labelOnButton={true}
              title="Move track down"
              disabled={trackIndex() >= trackCount() - 1}
              onClick={() =>
                props.track.engine.moveTrack(trackIndex(), trackIndex() + 1)
              }
            />
          </Row>

          {/* Compact volume slider (double-click resets to 0 dB). */}
          <div
            class={css`
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 4px 2px 0;
            `}
          >
            <input
              type="range"
              min={-48}
              max={6}
              step={0.5}
              value={trackState.volume}
              title="Track volume (dB)"
              onInput={(event) =>
                props.track.set({ volume: event.currentTarget.valueAsNumber })
              }
              onDblClick={() => props.track.set({ volume: 0 })}
              class={css`
                flex: 1;
                height: 14px;
                cursor: pointer;
                accent-color: #333;
              `}
            />
            <span
              class={css`
                min-width: 42px;
                text-align: right;
                font-family: 'oswald';
                font-size: 11px;
                color: rgba(0, 0, 0, 0.6);
              `}
            >
              {trackState.volume <= -48
                ? '-∞'
                : `${trackState.volume > 0 ? '+' : ''}${Math.round(
                    trackState.volume,
                  )} dB`}
            </span>
          </div>
        </ScreenPrintBackground>
      </DeviceWrapper>
      <Show when={!trackState.collapsed}>
        <DeviceChainView deviceChain={props.track.chain} renderDummy={false} />
      </Show>
    </Row>
  );
};
