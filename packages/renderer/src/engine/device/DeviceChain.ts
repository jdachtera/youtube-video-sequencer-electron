import type { Engine } from 'engine/Engine';
import type { PropertyUpdateEvents } from '../helpers';
import { entries } from '../helpers';
import type { DeepPartial, SerializedDevice } from '../types';
import type { SerializedDeviceBase } from './Device';
import { Device } from './Device';
import type { Step } from './Patttern';
import { createDevice } from './createDevice';
import { normalizeDeviceData } from './normalizeDeviceData';

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

  static normalizeData = (
    deviceChain: DeepPartial<SerializedDeviceChain>,
  ): SerializedDeviceChain => ({
    name: 'DeviceChain',
    collapsed: deviceChain.collapsed ?? false,
    color: 'grey',
    inputGain: deviceChain.inputGain ?? 1,
    volume: deviceChain.volume ?? 1,
    devices: (Array.isArray(deviceChain.devices) ? deviceChain.devices : [])
      .filter(
        (maybeDevice): maybeDevice is DeepPartial<SerializedDevice> =>
          !!maybeDevice,
      )
      .map(normalizeDeviceData)
      .filter((maybeDevice): maybeDevice is SerializedDevice => !!maybeDevice),
  });

  constructor(public engine: Engine, serializedChain: SerializedDeviceChain) {
    super(engine);

    this.set(serializedChain);
  }

  emitChange = () => this.emit('change', this);

  handleSequenceEvent = (time: number, step: Step) => {
    const firstDevice = this.devices[0];
    if (firstDevice) {
      firstDevice.handleSequenceEvent(time, step);
    }
  };

  set(partialSerializedDevice: Partial<SerializedDeviceChain>) {
    entries(partialSerializedDevice).forEach((entry) => {
      if (!entry) return;
      switch (entry[0]) {
        case 'devices':
          this.disposeDevices();
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          if (entry[1]!.length) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            entry[1]!.forEach((serializedDevice) =>
              this.addDevice(createDevice(this.engine, serializedDevice)),
            );
          } else {
            this.setDevices([]);
          }

          break;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit(`${entry[0]}Updated` as any, entry[1]);
    });

    super.set(partialSerializedDevice);
  }

  async hasLoaded() {
    await Promise.all(
      this.devices.map(async (device) => {
        await device.hasLoaded();
      }),
    );
  }

  protected setDevices(devices: Device[]) {
    this.input.disconnect();
    // Tear down the existing wiring before rebuilding so sequenceEvent
    // listeners don't accumulate (each rebuild would otherwise add another
    // copy, making every step fire multiple times).
    this.devices.forEach((device) => {
      device.output.disconnect();
      device.setInputDevice(undefined);
      device.off('sequenceEvent', this.emitSequenceEmvent);
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
    device.removeAllListeners('sequenceEvent');
    device.setInputDevice(undefined);

    const index = this.devices.indexOf(device);

    this.setDevices([
      ...this.devices.slice(0, index),
      ...this.devices.slice(index + 1),
    ]);
    this.emit('deviceRemoved', device);
    this.emit('change', this);
  }

  emitSequenceEmvent = (time: number, step: Step) => {
    this.emit('sequenceEvent', time, step);
  };

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
        // setInputDevice wires both the audio connection and the
        // sequenceEvent forwarding, so it must not be registered again here
        // or every step would fire twice.
        currentDevice.setInputDevice(prevDevice);
      }

      return currentDevice;
    }, undefined);

    const firstDevice = this.devices[0];
    const lastDevice = this.devices[this.devices.length - 1];

    if (lastDevice) {
      lastDevice.output.connect(this.output);
      lastDevice.on('sequenceEvent', this.emitSequenceEmvent);
    }

    this.input.connect(firstDevice ? firstDevice.input : this.output);
  }

  dispose() {
    super.dispose();
    this.disposeDevices();
  }

  serialize(): SerializedDeviceChain {
    return {
      name: 'DeviceChain',
      collapsed: this.collapsed,
      color: this.color,
      volume: this.output.gain.value,
      inputGain: this.input.gain.value,
      devices: this.devices.map((device) => device.serialize()),
    };
  }
}
