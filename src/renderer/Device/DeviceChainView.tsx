import { createSignal, For, JSX, splitProps } from 'solid-js';
import { createSignalFromEventEmitter } from '../createSignalFromEventEmitter';
import { DeviceView } from './DeviceView';
import { createDevice } from '../engine/device/createDevice';

import { DeviceChain } from '../engine/device/DeviceChain';

import { SerializedDevice } from '../engine/types';

import { DeviceWrapper } from '../UI';
import { normalizeDeviceData } from 'renderer/engine/device/normalizeDeviceData';
import { css } from 'solid-styled-components';

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

  const devices = createSignalFromEventEmitter(
    () => props.deviceChain,
    ['deviceAdded', 'deviceRemoved'],
    (chain) => chain.devices
  );

  const collapsed = createSignalFromEventEmitter(
    () => props.deviceChain,
    ['collapsedUpdated'],
    (chain) => chain.collapsed
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
      <For each={devices()}>
        {(device) => (
          <DeviceWrapper
            background="#969696"
            classList={{ device: true }}
            onClickRackEar={() => {
              device.set({ collapsed: !device.collapsed });
            }}
          >
            <DeviceView device={device} />
            <div>
              <button
                type="button"
                onClick={() => props.deviceChain.removeDevice(device)}
              >
                Remove Device
              </button>
            </div>
          </DeviceWrapper>
        )}
      </For>
      <DeviceWrapper background="#969696" classList={{ device: true }}>
        <div>
          <select
            onChange={(event) =>
              setSelectedDeviceName(
                event.currentTarget.value as SerializedDevice['name']
              )
            }
          >
            <For each={deviceNames}>
              {(deviceName) => <option value={deviceName}>{deviceName}</option>}
            </For>
          </select>
          <button
            type="button"
            onClick={() => {
              return props.deviceChain.addDevice(
                createDevice(
                  props.deviceChain.engine,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  normalizeDeviceData({
                    name: selectedDeviceName(),
                  })!
                )
              );
            }}
          >
            Add Device
          </button>
        </div>
      </DeviceWrapper>
    </div>
  );
};
