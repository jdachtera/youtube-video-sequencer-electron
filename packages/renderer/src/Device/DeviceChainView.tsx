import { css } from '@emotion/css';
import {
  createEffect,
  createSignal,
  For,
  mergeProps,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js';
import type { JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
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

// Popover menu of effects, opened by the compact "＋ FX" button. Rendered in a
// Portal (document.body) and fixed-positioned at the button, so it escapes any
// ancestor overflow:hidden / position:relative clipping and lands correctly.
const addEffectMenu = css`
  position: fixed;
  z-index: 20;
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
  // Portaled to the body and anchored to the button, so it can't be clipped by
  // an ancestor's overflow:hidden (e.g. the scrolling track area / master strip).
  const [showAddMenu, setShowAddMenu] = createSignal(false);
  const [menuPos, setMenuPos] = createSignal({ top: 0, left: 0 });
  let anchorEl: HTMLDivElement | undefined;
  let menuEl: HTMLDivElement | undefined;

  // Roughly the menu's footprint (label + the effect buttons) — used to flip it
  // above the button when there isn't room below, and to keep it on-screen.
  const MENU_HEIGHT = 230;
  const MENU_WIDTH = 130;

  const toggleAddMenu = () => {
    if (showAddMenu()) {
      setShowAddMenu(false);
      return;
    }
    const rect = anchorEl?.getBoundingClientRect();
    if (rect) {
      const openUp = rect.bottom + MENU_HEIGHT > window.innerHeight;
      const top = openUp
        ? Math.max(4, rect.top - MENU_HEIGHT)
        : rect.bottom + 2;
      const left = Math.max(
        4,
        Math.min(rect.left, window.innerWidth - MENU_WIDTH - 4),
      );
      setMenuPos({ top, left });
    }
    setShowAddMenu(true);
  };

  // Close on a click outside the menu/button while it's open. Deferred a tick so
  // the click that opened it doesn't immediately close it.
  createEffect(() => {
    if (!showAddMenu()) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuEl?.contains(target) && !anchorEl?.contains(target)) {
        setShowAddMenu(false);
      }
    };
    const timer = setTimeout(
      () => document.addEventListener('click', onDocClick),
      0,
    );
    onCleanup(() => {
      clearTimeout(timer);
      document.removeEventListener('click', onDocClick);
    });
  });

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
            <div class={addEffectPanel} ref={anchorEl}>
              <ButtonWithLabel
                label={showAddMenu() ? '✕ FX' : '＋ FX'}
                labelOnButton
                title="Add an effect to this track"
                activated={showAddMenu()}
                onClick={toggleAddMenu}
              />
              <Show when={showAddMenu()}>
                <Portal>
                  <div
                    ref={menuEl}
                    class={addEffectMenu}
                    style={{
                      top: `${menuPos().top}px`,
                      left: `${menuPos().left}px`,
                    }}
                  >
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
                </Portal>
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
