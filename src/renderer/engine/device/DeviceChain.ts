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

  emitChange = () => this.emit('change', this);

  set(partialSerializedDevice: Partial<SerializedDeviceChain>) {
    entries(partialSerializedDevice).forEach((entry) => {
      if (!entry) return;
      switch (entry[0]) {
        case 'devices':
          this.disposeDevices();

          entry[1]!.forEach((serializedDevice) =>
            this.addDevice(createDevice(this.engine, serializedDevice))
          );
          break;
      }
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedDevice);
  }

  async hasLoaded() {
    await Promise.all(
      this.devices.map(async (device) => {
        await device.hasLoaded();
      })
    );
  }

  protected setDevices(devices: Device[]) {
    this.devices.forEach((device) => {
      device.output.disconnect();
    });
    this.devices = devices;

    this.connectDevices();
  }

  findDevice(predicate: (device: Device) => boolean): Device | undefined {
    return this.devices.find(predicate);
  }

  addDevice(device: Device, index: number = this.devices.length) {
    device.on('change', this.emitChange);

    this.setDevices([
      ...this.devices.slice(0, index),
      device,
      ...this.devices.slice(index + 1),
    ]);

    this.emit('deviceAdded', device);
    this.emit('change', this);
  }

  removeDevice(device: Device) {
    device.off('change', this.emitChange);
    device.setInputDevice(undefined);

    const index = this.devices.indexOf(device);

    this.setDevices([
      ...this.devices.slice(0, index),
      ...this.devices.slice(index + 1),
    ]);
    this.emit('deviceRemoved', device);
    this.emit('change', this);
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
    }, undefined);

    const lastDevice = this.devices.at(this.devices.length - 1);

    if (lastDevice) {
      lastDevice.output.connect(this.output);
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
