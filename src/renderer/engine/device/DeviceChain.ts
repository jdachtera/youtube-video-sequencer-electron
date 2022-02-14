import { Device, SerializedDeviceBase } from './Device';
import { entries, PropertyUpdateEvents } from '../helpers';
import { Engine } from '../Engine';
import { SerializedDevice } from '../types';
import { createDevice } from './createDevice';

export type SerializedDeviceChain = SerializedDeviceBase & {
  name: 'DeviceChain';
  devices: SerializedDevice[];
};

type DeviceChainEvents = {
  deviceAdded: (sampler: Device) => void;
  deviceRemoved: (sampler: Device) => void;
  change: (deviceChain: Device) => void;
} & PropertyUpdateEvents<SerializedDeviceChain>;

export class DeviceChain extends Device<DeviceChainEvents> {
  devices: Device[] = [];

  constructor(engine: Engine, serializedChain: SerializedDeviceChain) {
    super(engine);
    this.set(serializedChain);
  }

  set(partialSerializedDevice: Partial<SerializedDeviceChain>) {
    super.set(partialSerializedDevice);

    entries(partialSerializedDevice).forEach((entry) => {
      if (!entry) return;
      switch (entry[0]) {
        case 'devices':
          this.disposeDevices();
          this.setDevices(
            entry[1]!.map((serializedDevice) =>
              createDevice(this.engine, serializedDevice)
            )
          );
          break;
      }
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    this.emit('change', this);
  }

  async hasLoaded() {
    await Promise.all(
      this.devices.map(async (device) => {
        await device.hasLoaded();
      })
    );
  }

  protected setDevices(devices: Device[]) {
    this.devices = devices;
    this.connectDevices();
  }

  findDevice(predicate: (device: Device) => boolean): Device | undefined {
    return this.devices.find(predicate);
  }

  addDevice(device: Device, index: number) {
    this.setDevices([
      ...this.devices.slice(0, index),
      device,
      ...this.devices.slice(index + 1),
    ]);
  }

  removeDevice(device: Device) {
    device.setInputDevice(undefined);

    const index = this.devices.indexOf(device);

    this.setDevices([
      ...this.devices.slice(0, index),
      ...this.devices.slice(index + 1),
    ]);
  }

  moveDevice(device: Device, index: number) {
    this.removeDevice(device);
    this.addDevice(device, index);
  }

  disposeDevices() {
    this.devices.forEach((device) => {
      this.removeDevice(device);
      device.dispose();
    });
  }

  connectDevices() {
    this.devices.reduce((prevDevice: Device | undefined, currentDevice) => {
      if (prevDevice) {
        currentDevice.setInputDevice(prevDevice);
      }

      return currentDevice;
    });

    const lastDevice = this.devices.at(this.devices.length - 1);

    if (lastDevice) {
      this.setInputDevice(lastDevice);
    }
  }

  dispose() {
    super.dispose();
    this.disposeDevices();
  }

  serialize(): SerializedDeviceChain {
    return {
      name: 'DeviceChain',
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      devices: this.devices.map((device) => device.serialize()),
    };
  }
}
