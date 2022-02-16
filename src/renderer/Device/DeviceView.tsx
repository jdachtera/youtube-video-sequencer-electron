import { Match, Switch } from 'solid-js';
import { DeviceChainView } from './DeviceChainView';

import { Device } from '../engine/device/Device';
import { DeviceChain } from '../engine/device/DeviceChain';
import { Filter } from '../engine/device/Filter';
import { Sampler } from '../engine/device/Sampler';

import { PingPongDelayView } from './PingPongDelayView';
import { SamplerView } from './SamplerView';
import { FilterView } from './FilterView';
import { PingPongDelay } from 'renderer/engine/device/PingPongDelay';
import { Distortion } from 'renderer/engine/device/Distortion';
import { DistortionView } from './DistortionView';

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
    <Match when={props.device instanceof PingPongDelay && props.device}>
      {(device) => (
        <PingPongDelayView pingPongDelay={device}></PingPongDelayView>
      )}
    </Match>
    <Match when={props.device instanceof Distortion && props.device}>
      {(device) => <DistortionView distortion={device}></DistortionView>}
    </Match>
    <Match when={props.device instanceof Distortion && props.device}>
      {(device) => <DistortionView distortion={device}></DistortionView>}
    </Match>
  </Switch>
);
