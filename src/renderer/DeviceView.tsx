import { For, Match, Switch } from 'solid-js';
import { Device } from './engine/device/Device';
import { DeviceChain } from './engine/device/DeviceChain';
import { Sampler } from './engine/device/Sampler';
import { SamplerView } from './SamplerView';
import { DeviceWrapper } from './UI';

export const DeviceView = (props: { device: Device }) => (
  <Switch>
    <Match when={props.device instanceof DeviceChain && props.device}>
      {(deviceChain) => (
        <For each={deviceChain.devices}>
          {(device) => (
            <DeviceWrapper background="#969696">
              <DeviceView device={device} />
              <div>
                <button
                  type="button"
                  onClick={() => deviceChain.removeDevice(device)}
                >
                  Remove Device
                </button>
              </div>
            </DeviceWrapper>
          )}
        </For>
      )}
    </Match>
    <Match when={props.device instanceof Sampler && props.device}>
      {(device) => <SamplerView sampler={device}></SamplerView>}
    </Match>
  </Switch>
);
