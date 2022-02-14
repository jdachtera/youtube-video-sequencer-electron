import { For, Match, Switch } from 'solid-js';
import { Device } from './engine/device/Device';
import { DeviceChain } from './engine/device/DeviceChain';
import { Sampler } from './engine/device/Sampler';
import { PatternEditor } from './PatternEditor';

export const PatternView = (props: { device: Device }) => {
  return (
    <Switch>
      <Match when={props.device instanceof DeviceChain && props.device}>
        {(device) => (
          <For each={device.devices}>
            {(device) => <PatternView device={device}></PatternView>}
          </For>
        )}
      </Match>
      <Match when={props.device instanceof Sampler && props.device}>
        {(device) => <PatternEditor sampler={device}></PatternEditor>}
      </Match>
    </Switch>
  );
};
