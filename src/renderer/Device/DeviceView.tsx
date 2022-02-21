import { Match, mergeProps, Switch } from 'solid-js';
import { DeviceChainView } from './DeviceChainView';

import { Device } from '../engine/device/Device';
import { DeviceChain } from '../engine/device/DeviceChain';
import { FilterDevice } from '../engine/device/Filter';
import { SamplerDevice } from '../engine/device/Sampler';
import { DistortionDevice } from 'renderer/engine/device/Distortion';
import { CompressorDevice } from 'renderer/engine/device/Compressor';
import { PingPongDelayDevice } from 'renderer/engine/device/PingPongDelay';

import { PingPongDelayView } from './PingPongDelayView';
import { SamplerView } from './SamplerView';
import { FilterView } from './FilterView';
import { DistortionView } from './DistortionView';
import { CompressorView } from './CompressorView';
import { ReverbDevice } from 'renderer/engine/device/Reverb';
import { ReverbView } from './ReverbView';
import { DeviceWrapper } from 'renderer/UI';

export const DeviceView = (props: {
  device: Device;
  onRequestRemoveDevice: (device: Device) => void;
}) => {
  return (
    <Switch
      fallback={() => {
        return (
          <DeviceWrapper
            background={props.device.color}
            classList={{ device: true }}
            onClickLeftRackEar={() => {
              props.device.set({ collapsed: !props.device.collapsed });
            }}
            onClickRightRackEar={() => {
              if (!confirm('Really remove device?')) return;
              props.onRequestRemoveDevice(props.device);
            }}
          >
            <Switch>
              <Match
                when={props.device instanceof FilterDevice && props.device}
              >
                {(device) => <FilterView filter={device}></FilterView>}
              </Match>
              <Match
                when={
                  props.device instanceof PingPongDelayDevice && props.device
                }
              >
                {(device) => (
                  <PingPongDelayView pingPongDelay={device}></PingPongDelayView>
                )}
              </Match>
              <Match
                when={props.device instanceof DistortionDevice && props.device}
              >
                {(device) => (
                  <DistortionView distortion={device}></DistortionView>
                )}
              </Match>
              <Match
                when={props.device instanceof DistortionDevice && props.device}
              >
                {(device) => (
                  <DistortionView distortion={device}></DistortionView>
                )}
              </Match>
              <Match
                when={props.device instanceof CompressorDevice && props.device}
              >
                {(device) => (
                  <CompressorView compressor={device}></CompressorView>
                )}
              </Match>
              <Match
                when={props.device instanceof ReverbDevice && props.device}
              >
                {(device) => <ReverbView reverb={device}></ReverbView>}
              </Match>
              <Match
                when={props.device instanceof SamplerDevice && props.device}
              >
                {(device) => <SamplerView sampler={device}></SamplerView>}
              </Match>
            </Switch>
          </DeviceWrapper>
        );
      }}
    >
      <Match when={props.device instanceof DeviceChain && props.device}>
        {(deviceChain) => (
          <DeviceChainView deviceChain={deviceChain}></DeviceChainView>
        )}
      </Match>
    </Switch>
  );
};
