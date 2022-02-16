import { Match, Switch } from 'solid-js';
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

export const DeviceView = (props: { device: Device }) => (
  <Switch>
    <Match when={props.device instanceof DeviceChain && props.device}>
      {(deviceChain) => (
        <DeviceChainView deviceChain={deviceChain}></DeviceChainView>
      )}
    </Match>
    <Match when={props.device instanceof SamplerDevice && props.device}>
      {(device) => <SamplerView sampler={device}></SamplerView>}
    </Match>
    <Match when={props.device instanceof FilterDevice && props.device}>
      {(device) => <FilterView filter={device}></FilterView>}
    </Match>
    <Match when={props.device instanceof PingPongDelayDevice && props.device}>
      {(device) => (
        <PingPongDelayView pingPongDelay={device}></PingPongDelayView>
      )}
    </Match>
    <Match when={props.device instanceof DistortionDevice && props.device}>
      {(device) => <DistortionView distortion={device}></DistortionView>}
    </Match>
    <Match when={props.device instanceof DistortionDevice && props.device}>
      {(device) => <DistortionView distortion={device}></DistortionView>}
    </Match>
    <Match when={props.device instanceof CompressorDevice && props.device}>
      {(device) => <CompressorView compressor={device}></CompressorView>}
    </Match>
  </Switch>
);
