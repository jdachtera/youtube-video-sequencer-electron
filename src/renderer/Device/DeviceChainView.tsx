import { createSignal, For } from 'solid-js';
import { createSignalFromEventEmitter } from '../createSignalFromEventEmitter';
import { DeviceView } from './DeviceView';
import { createDevice } from '../engine/device/createDevice';

import { DeviceChain } from '../engine/device/DeviceChain';

import { SerializedDevice } from '../engine/types';

import { DeviceWrapper } from '../UI';
import { normalizeDeviceData } from 'renderer/engine/device/normalizeDeviceData';

const deviceNames: SerializedDevice['name'][] = [
  // 'DeviceChain',
  'Filter',
  //  'Sampler',
  'PingPongDelay',
  'Reverb',
  'Distortion',
  'Compressor',
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
