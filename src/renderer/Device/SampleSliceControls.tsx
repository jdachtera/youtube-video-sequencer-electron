import { css, keyframes } from '@emotion/css';
import { lighten } from 'polished';
import { Slice } from 'renderer/engine/device/Slice';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from 'renderer/engine/EngineBase';
import { ButtonWithLabel } from 'renderer/UI/ButtonWithLabel';
import { DeviceWrapper } from 'renderer/UI/DeviceWrapper';
import { Row } from 'renderer/UI/Grid';
import { InputLCD } from 'renderer/UI/lcdStyles';
import { ScreenPrintBackground } from 'renderer/UI/ScreenPrintBackground';
import { For } from 'solid-js';
import { Time } from 'tone';

export const SampleSliceChannelControls = (props: {
  slice: Slice;
  toggleCollapse: () => void;
  onRemoveSlice: (slice: Slice) => void;
}) => {
  const sliceState = createStoreFromEventEmitter(
    () => props.slice,
    (slice) => ({
      name: slice.name,
      mute: slice.player.mute,
      solo: slice.soloNode.solo,
      color: slice.color,
    }),
    ['soloUpdated', 'muteUpdated', 'colorUpdated', 'nameUpdated']
  );

  const viewMode = createStoreFromEventEmitter(
    () => props.slice.sampler.engine,
    (engine) => engine.viewMode,
    'viewModeUpdated'
  );

  return (
    <DeviceWrapper
      hidden={!viewMode.channel}
      onClickLeftRackEar={props.toggleCollapse}
      onClickRightRackEar={() => props.onRemoveSlice(props.slice)}
      background={sliceState.color}
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
            value={sliceState.name}
            onInput={(event) => {
              props.slice.set({ name: event.currentTarget.value });
            }}
          />
          <ButtonWithLabel
            label="Solo"
            activated={sliceState.solo}
            labelOnButton={true}
            onClick={(event) => {
              props.slice.setSolo(!sliceState.solo, event.altKey);
            }}
          />
          <ButtonWithLabel
            label="Mute"
            activated={sliceState.mute}
            labelOnButton={true}
            onClick={() => {
              props.slice.set({ mute: !sliceState.mute });
            }}
          />
        </Row>
      </ScreenPrintBackground>

      <PatternSelector slice={props.slice} />
    </DeviceWrapper>
  );
};

const PatternSelector = (props: { slice: Slice }) => {
  const sliceState = createStoreFromEventEmitter(
    () => props.slice,
    (slice) => ({
      collapsed: slice.collapsed,
      patterns: slice.patterns,
      autoSelectPattern: slice.autoSelectPattern,
      currentPatternIndex: slice.currentPatternIndex,
      selectedPatternIndex: slice.selectedPatternIndex,
      cuedPatternIndex: slice.cuedPatternIndex,
    }),
    [
      'collapsedUpdated',
      'patternAdded',
      'patternRemoved',
      'autoSelectPatternUpdated',
      'currentPatternIndexUpdated',
      'selectedPatternIndexUpdated',
      'cuedPatternIndexUpdated',
    ]
  );

  return (
    <ScreenPrintBackground background={'rgba(255,255,255,0.2)'}>
      <Row
        class={css`
          margin-top: 10px;
        `}
      >
        <ul
          class={css`
            display: flex;
            flex-direction: column;
            list-style: none;
            flex: 1;
          `}
        >
          <For each={sliceState.patterns}>
            {(pattern, index) => {
              const patternState = createStoreFromEventEmitter(
                () => pattern,
                (pattern) => ({ color: pattern.color, name: pattern.name }),
                ['colorUpdated', 'nameUpdated']
              );

              return (
                <li
                  classList={{
                    [css`
                      border: 1px black solid;
                      display: flex;
                      background-color: ${patternState.color};
                      cursor: pointer;
                    `]: true,
                    [css`
                      background-color: ${lighten(0.2, patternState.color)};
                    `]: index() === sliceState.selectedPatternIndex,
                  }}
                >
                  <ButtonWithLabel
                    label={'▶'}
                    blinkInterval={
                      index() === sliceState.cuedPatternIndex &&
                      index() !== sliceState.currentPatternIndex
                        ? 60 / props.slice.engine.transport.bpm.value
                        : 0
                    }
                    activated={index() === sliceState.currentPatternIndex}
                    labelOnButton={true}
                    onClick={(event) => {
                      event.preventDefault();
                      props.slice.cuePattern(
                        index(),

                        Time(
                          Time(pattern.engine.transport.position).quantize('1n')
                        ).toBarsBeatsSixteenths()
                      );

                      if (pattern.engine.transport.state !== 'started') {
                        pattern.engine.start();
                      }
                    }}
                  />
                  <input
                    type="text"
                    onClick={(event) => {
                      event.preventDefault();
                      props.slice.set({ selectedPatternIndex: index() });
                    }}
                    class={css`
                      border: 0;
                      flex: 1;
                      font-size: 18px;
                      font-family: 'Oswald';
                      margin-left: 5px;
                      background: transparent;
                      cursor: pointer;
                      color: ${lighten(0.1, 'black')};
                      &:active,
                      &:focus {
                        outline: none;
                        border: none;
                      }
                    `}
                    value={patternState.name}
                    onInput={(event) =>
                      pattern.set({ name: event.currentTarget.value })
                    }
                  />
                </li>
              );
            }}
          </For>
        </ul>
      </Row>
    </ScreenPrintBackground>
  );
};
