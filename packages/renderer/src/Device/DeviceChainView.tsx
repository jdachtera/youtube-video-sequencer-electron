import { css } from '@emotion/css';
import {
  createSignal,
  For,
  mergeProps,
  Show as div,
  Show,
  splitProps,
} from 'solid-js';
import type { JSX } from 'solid-js';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { DeviceWrapper, DummyDevice } from '../UI/DeviceWrapper';
import { Column, Row } from '../UI/Grid';
import { SameHeightContainer } from '../UI/SameHeightContainer';
import { SelectWithArrowButtons } from '../UI/SelectWithArrowButtons';
import {
  createSignalFromEventEmitter,
  createStoreFromEventEmitter,
} from '../engine/EngineBase';
import type { DeviceChain } from '../engine/device/DeviceChain';
import { SamplerDevice } from '../engine/device/Sampler';
import { createDevice } from '../engine/device/createDevice';
import { normalizeDeviceData } from '../engine/device/normalizeDeviceData';
import type { SerializedDevice } from '../engine/types';
import { DeviceView } from './DeviceView';
import { SamplerSlicesView } from './SamplerSlicesView';

const deviceNames: SerializedDevice['name'][] = [
  // 'DeviceChain',
  'Filter',
  //  'Sampler',
  'PingPongDelay',
  'Reverb',
  'Distortion',
  'Compressor',
];

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
  const [selectedDeviceName, setSelectedDeviceName] =
    createSignal<SerializedDevice['name']>('Filter');

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
              {(device) => (
                <DeviceView
                  device={device}
                  onRequestRemoveDevice={() =>
                    props.deviceChain.removeDevice(device)
                  }
                />
              )}
            </For>
          </SameHeightContainer>

          <DeviceWrapper background="#969696" classList={{ device: true }}>
            <SelectWithArrowButtons
              options={deviceNames}
              selectedOption={selectedDeviceName()}
              onChange={(deviceName) => setSelectedDeviceName(deviceName)}
            />
            <ButtonWithLabel
              label="Add device"
              labelOnButton={true}
              onClick={() => {
                props.deviceChain.addDevice(
                  createDevice(
                    props.deviceChain.engine,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    normalizeDeviceData({
                      name: selectedDeviceName(),
                    })!,
                  ),
                );
              }}
            />
          </DeviceWrapper>
          <DummyDevice />
        </Row>

        <Row>
          <For each={devices()}>
            {(device) =>
              device instanceof SamplerDevice ? (
                <SamplerSlicesView sampler={device} />
              ) : null
            }
          </For>
        </Row>
        <Show when={props.renderDummy}>
          <DummyDevice />
        </Show>
      </Column>
    </div>
  );
};
