import {
  createSignal,
  For,
  JSX,
  mergeProps,
  Show as div,
  Show,
  splitProps,
} from 'solid-js';

import { DeviceView } from './DeviceView';
import { createDevice } from '../engine/device/createDevice';

import { DeviceChain } from '../engine/device/DeviceChain';

import { SerializedDevice } from '../engine/types';

import { DeviceWrapper, DummyDevice } from '../UI/DeviceWrapper';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { normalizeDeviceData } from 'renderer/engine/device/normalizeDeviceData';
import { css } from 'renderer/emotion-solid';
import { SamplerDevice } from 'renderer/engine/device/Sampler';
import { SamplerSlicesView } from './SamplerSlicesView';
import { Column, Row } from 'renderer/UI/Grid';
import { SameHeightContainer } from 'renderer/UI/SameHeightContainer';
import { SelectWithArrowButtons } from 'renderer/UI/SelectWithArrowButtons';

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
  } & JSX.IntrinsicElements['div']
) => {
  const allProps = mergeProps({ renderDummy: true }, propsWithoutDefaults);
  const [props, divProps] = splitProps(allProps, [
    'deviceChain',
    'renderDummy',
  ]);
  const [selectedDeviceName, setSelectedDeviceName] =
    createSignal<SerializedDevice['name']>('Filter');

  const viewMode = props.deviceChain.engine.createStore(
    (engine) => engine.viewMode,
    ['viewModeUpdated']
  );

  const devices = props.deviceChain.createSignal(
    (chain) => chain.devices,
    ['deviceAdded', 'deviceRemoved']
  );

  const collapsed = props.deviceChain.createSignal(
    (chain) => chain.collapsed,
    'collapsedUpdated'
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
                    })!
                  )
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
