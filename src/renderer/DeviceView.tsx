import { Match, Switch } from 'solid-js';
import { DeviceChainView } from './DeviceChainView';

import { Device } from './engine/device/Device';
import { DeviceChain } from './engine/device/DeviceChain';
import { Filter } from './engine/device/Filter';
import { Sampler } from './engine/device/Sampler';

import { FilterView } from './FilterView';
import { SamplerView } from './SamplerView';

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
