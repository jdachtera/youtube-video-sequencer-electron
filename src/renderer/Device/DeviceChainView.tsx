import { createSignal, For, JSX, splitProps } from 'solid-js';

import { DeviceView } from './DeviceView';
import { createDevice } from '../engine/device/createDevice';

import { DeviceChain } from '../engine/device/DeviceChain';

import { SerializedDevice } from '../engine/types';

import { ButtonWithLabel, DeviceWrapper, SelectWithArrowButtons } from '../UI';
import { normalizeDeviceData } from 'renderer/engine/device/normalizeDeviceData';
import { css } from 'renderer/emotion-solid';
import { SamplerDevice } from 'renderer/engine/device/Sampler';
import { SamplerSlicesView } from './SamplerSlicesView';
import { Column, Row } from 'renderer/Grid';

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
  allProps: { deviceChain: DeviceChain } & JSX.IntrinsicElements['div']
) => {
  const [props, divProps] = splitProps(allProps, ['deviceChain']);
  const [selectedDeviceName, setSelectedDeviceName] =
    createSignal<SerializedDevice['name']>('Filter');

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
      <Column>
        <Row>
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
      </Column>
    </div>
  );
};
