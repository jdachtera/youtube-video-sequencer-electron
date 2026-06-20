import { css } from '@emotion/css';
import type { Track } from 'engine/Track';
import { Show } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { DeviceWrapper } from '../UI/DeviceWrapper';
import { Row } from '../UI/Grid';
import { ScreenPrintBackground } from '../UI/ScreenPrintBackground';
import { InputLCD } from '../UI/lcdStyles';
import { createStoreFromEventEmitter } from '../engine/EngineBase';
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

  return (
    <Row classList={{ Track: true }}>
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
