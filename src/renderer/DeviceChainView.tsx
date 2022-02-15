import { createSignal, For } from 'solid-js';
import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { DeviceView } from './DeviceView';
import { createDevice } from './engine/device/createDevice';

import { DeviceChain } from './engine/device/DeviceChain';

import { normalizeDeviceData } from './engine/normalizeData';
import { SerializedDevice } from './engine/types';

import { DeviceWrapper } from './UI';

const deviceNames: SerializedDevice['name'][] = [
  // 'DeviceChain',
  'Filter',
  //  'Sampler',
];

export const DeviceChainView = (props: { deviceChain: DeviceChain }) => {
  const [selectedDeviceName, setSelectedDeviceName] =
    createSignal<SerializedDevice['name']>('Filter');

  const devices = createSignalFromEventEmitter(
    () => props.deviceChain,
    ['deviceAdded', 'deviceRemoved'],
    (chain) => chain.devices
  );

  return (
    <>
      <For each={devices()}>
        {(device) => (
          <DeviceWrapper background="#969696">
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
      <div>
        <select>
          <For each={deviceNames}>
            {(deviceName) => (
              <option
                selected={selectedDeviceName() === deviceName}
                onClick={() => setSelectedDeviceName(deviceName)}
              >
                {deviceName}
              </option>
            )}
          </For>
        </select>
        <button
          type="button"
          onClick={() => {
            return props.deviceChain.addDevice(
              createDevice(
                props.deviceChain.engine,
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
    </>
  );
};
