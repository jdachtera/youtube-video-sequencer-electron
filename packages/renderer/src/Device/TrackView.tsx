import { css } from '@emotion/css';
import type { Track } from 'engine/Track';
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
    }),
    ['colorUpdated', 'nameUpdated', 'soloUpdated', 'muteUpdated'],
  );

  const viewMode = createStoreFromEventEmitter(
    () => props.track.engine,
    (engine) => engine.viewMode,
    'viewModeUpdated',
  );

  return (
    <Row>
      <DeviceWrapper
        hidden={!viewMode.channel}
        onClickLeftRackEar={() =>
          props.track.set({ collapsed: !trackState.collapsed })
        }
        background={trackState.color}
      >
        <ScreenPrintBackground background={'rgba(255,255,255,0.2)'}>
          <Row
            classList={{
              [css`
                flex: 1;
                margin-top: 20px 0;
              `]: true,
            }}
          >
            <InputLCD
              classList={{
                [css`
                  width: 150px;
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
        </ScreenPrintBackground>
      </DeviceWrapper>
      <DeviceChainView deviceChain={props.track.chain} renderDummy={false} />
    </Row>
  );
};
