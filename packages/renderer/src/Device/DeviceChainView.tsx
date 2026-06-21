import { css } from '@emotion/css';
import { createSignal, For, mergeProps, Show, splitProps } from 'solid-js';
import type { JSX } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { DeviceWrapper, DummyDevice } from '../UI/DeviceWrapper';
import { Column, Row } from '../UI/Grid';
import { SameHeightContainer } from '../UI/SameHeightContainer';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { DeviceChain } from '../engine/device/DeviceChain';
import { createDevice } from '../engine/device/createDevice';
import { normalizeDeviceData } from '../engine/device/normalizeDeviceData';
import type { SerializedDevice } from '../engine/types';
import { DeviceView } from './DeviceView';

const deviceNames: SerializedDevice['name'][] = [
  // 'DeviceChain',
  'Filter',
  //  'Sampler',
  'PingPongDelay',
  'Reverb',
  'Distortion',
  'Compressor',
];

// Friendlier labels for the one-click add buttons.
const effectLabels: Partial<Record<SerializedDevice['name'], string>> = {
  PingPongDelay: 'Delay',
  Distortion: 'Dist',
  Compressor: 'Comp',
};

const addEffectPanel = css`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2px;
`;

// Popover menu of effects, opened by the compact "＋ FX" button. Floats over the
// chain so it doesn't add a permanent column of buttons to every track.
const addEffectMenu = css`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px;
  border-radius: 6px;
  background: #2b2b2b;
  border: 1px solid rgba(0, 0, 0, 0.5);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
`;

const addEffectMenuLabel = css`
  font-family: 'oswald';
  font-size: 10px;
  color: #cfcfcf;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 1px;
`;

export const DeviceChainView = (
  propsWithoutDefaults: {
    deviceChain: DeviceChain;
    renderDummy?: boolean;
  } & JSX.IntrinsicElements['div'],
) => {
  const allProps = mergeProps({ renderDummy: true }, propsWithoutDefaults);
  const [props, divProps] = splitProps(allProps, [
    'deviceChain',
    'renderDummy',
  ]);

  const viewMode = createStoreFromEventEmitter(
    () => props.deviceChain.engine,
    (engine) => engine.viewMode,
    ['viewModeUpdated'],
  );

  const devices = createSignalFromEventEmitter(
    () => props.deviceChain,
    (chain) => chain.devices,
    ['deviceAdded', 'deviceRemoved'],
  );

  const collapsed = createSignalFromEventEmitter(
    () => props.deviceChain,
    (chain) => chain.collapsed,
    'collapsedUpdated',
  );

  // Compact "＋ FX" popover (replaces a permanent column of effect buttons).
  const [showAddMenu, setShowAddMenu] = createSignal(false);

  // Drag-and-drop reordering of effects.
  const [draggedIndex, setDraggedIndex] = createSignal<number | null>(null);
  const [dropTarget, setDropTarget] = createSignal<{
    index: number;
    after: boolean;
  } | null>(null);

  const onSlotDragOver = (event: DragEvent, index: number) => {
    if (draggedIndex() === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const after = event.clientX > rect.left + rect.width / 2;
    setDropTarget({ index, after });
  };

  const onSlotDrop = () => {
    const from = draggedIndex();
    const target = dropTarget();
    setDraggedIndex(null);
    setDropTarget(null);
    if (from === null || !target) return;

    const gap = target.index + (target.after ? 1 : 0);
    // Account for the dragged device being removed before re-insertion.
    const finalIndex = from < gap ? gap - 1 : gap;
    if (finalIndex === from) return;

    props.deviceChain.moveDevice(devices()[from], finalIndex);
  };

  return (
    <div
      {...divProps}
      classList={{
        [css`
          display: flex;
        `]: true,
        [css`
          display: none;
        `]: collapsed(),
        ...divProps.classList,
      }}
    >
      <Column
        classList={{
          [css`
            flex: 1;
          `]: true,
        }}
      >
        <Row
          classList={{
            [css`
              display: none;
            `]: !viewMode.device,
          }}
        >
          <SameHeightContainer
            class={css`
              display: flex;
            `}
          >
            <For each={devices()}>
              {(device, index) => {
                // Only effects get the drag-to-reorder header; the Sequencer
                // and Slice must stay put at the head of the chain.
                const name = device.serialize().name;
                const isEffect = (deviceNames as string[]).includes(name);
                return (
                  <div
                    classList={{
                      [css`
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        transition: opacity 0.12s ease;
                      `]: true,
                      [css`
                        opacity: 0.4;
                      `]: isEffect && draggedIndex() === index(),
                      [css`
                        box-shadow: inset 3px 0 0 0 #ff9100;
                      `]:
                        isEffect &&
                        dropTarget()?.index === index() &&
                        !dropTarget()?.after,
                      [css`
                        box-shadow: inset -3px 0 0 0 #ff9100;
                      `]:
                        isEffect &&
                        dropTarget()?.index === index() &&
                        dropTarget()?.after,
                    }}
                    onDragOver={(event) => {
                      if (isEffect) onSlotDragOver(event, index());
                    }}
                    onDrop={() => {
                      if (isEffect) onSlotDrop();
                    }}
                  >
                    <Show when={isEffect}>
                      <div
                        draggable={true}
                        onDragStart={(event) => {
                          setDraggedIndex(index());
                          if (event.dataTransfer)
                            event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDropTarget(null);
                        }}
                        title="Drag to reorder"
                        class={css`
                          display: flex;
                          align-items: center;
                          gap: 6px;
                          padding: 3px 6px;
                          margin: 0 4px;
                          cursor: grab;
                          font-family: 'oswald';
                          font-size: 12px;
                          color: #e8e8e8;
                          background: rgba(0, 0, 0, 0.28);
                          border-radius: 4px 4px 0 0;
                          user-select: none;
                          &:active {
                            cursor: grabbing;
                          }
                        `}
                      >
                        <span
                          class={css`
                            color: rgba(255, 255, 255, 0.5);
                            letter-spacing: -1px;
                            font-size: 13px;
                          `}
                        >
                          ⠿
                        </span>
                        <span
                          class={css`
                            flex: 1;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                          `}
                        >
                          {name}
                        </span>
                        <button
                          type="button"
                          title="Remove effect"
                          onClick={() => props.deviceChain.removeDevice(device)}
                          class={css`
                            border: none;
                            background: transparent;
                            color: rgba(255, 255, 255, 0.55);
                            cursor: pointer;
                            font-size: 14px;
                            line-height: 1;
                            padding: 0 2px;
                            border-radius: 3px;
                            &:hover {
                              color: #fff;
                              background: #c0392b;
                            }
                          `}
                        >
                          ×
                        </button>
                      </div>
                    </Show>
                    <DeviceView
                      device={device}
                      onRequestRemoveDevice={() =>
                        props.deviceChain.removeDevice(device)
                      }
                    />
                  </div>
                );
              }}
            </For>
          </SameHeightContainer>

          <DeviceWrapper background="#969696" classList={{ device: true }}>
            <div class={addEffectPanel}>
              <ButtonWithLabel
                label={showAddMenu() ? '✕ FX' : '＋ FX'}
                labelOnButton
                title="Add an effect to this track"
                activated={showAddMenu()}
                onClick={() => setShowAddMenu((open) => !open)}
              />
              <Show when={showAddMenu()}>
                <div class={addEffectMenu}>
                  <span class={addEffectMenuLabel}>Add effect</span>
                  <For each={deviceNames}>
                    {(name) => (
                      <ButtonWithLabel
                        label={`＋ ${effectLabels[name] ?? name}`}
                        labelOnButton
                        onClick={() => {
                          props.deviceChain.addDevice(
                            createDevice(
                              props.deviceChain.engine,
                              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                              normalizeDeviceData({ name })!,
                            ),
                          );
                          setShowAddMenu(false);
                        }}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </DeviceWrapper>
          <DummyDevice />
        </Row>

        <Show when={props.renderDummy}>
          <DummyDevice />
        </Show>
      </Column>
    </div>
  );
};
