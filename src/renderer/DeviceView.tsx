import { createSignal, For, Match, Switch } from 'solid-js';
import { createSignalFromEventEmitter } from './createSignalFromEventEmitter';
import { createDevice } from './engine/device/createDevice';
import { Device } from './engine/device/Device';
import { DeviceChain } from './engine/device/DeviceChain';
import { Filter } from './engine/device/Filter';
import { Sampler } from './engine/device/Sampler';
import { normalizeDeviceData } from './engine/normalizeData';
import { SerializedDevice } from './engine/types';
import { FilterView } from './FilterView';
import { SamplerView } from './SamplerView';
import { DeviceWrapper } from './UI';

export const DeviceView = (props: { device: Device }) => (
  <Switch>
    <Match when={props.device instanceof DeviceChain && props.device}>
      {(deviceChain) => (
        <DeviceChainView deviceChain={deviceChain}></DeviceChainView>
      )}
    </Match>
    <Match when={props.device instanceof Sampler && props.device}>
      {(device) => <SamplerView sampler={device}></SamplerView>}
    </Match>
    <Match when={props.device instanceof Filter && props.device}>
      {(device) => <FilterView filter={device}></FilterView>}
    </Match>
  </Switch>
);

const deviceNames: SerializedDevice['name'][] = [
  'DeviceChain',
  'Filter',
  'Sampler',
];

const DeviceChainView = (props: { deviceChain: DeviceChain }) => {
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
