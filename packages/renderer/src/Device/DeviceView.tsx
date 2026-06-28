import { css } from '@emotion/css';
import { Match, Show, Switch } from 'solid-js';
import { DeviceWrapper } from '../UI/DeviceWrapper';
import { createSignalFromEventEmitter } from '../engine/EngineBase';
import { CompressorDevice } from '../engine/device/Compressor';
import type { Device } from '../engine/device/Device';
import { DeviceChain } from '../engine/device/DeviceChain';
import { DistortionDevice } from '../engine/device/Distortion';
import { FilterDevice } from '../engine/device/Filter';
import { PingPongDelayDevice } from '../engine/device/PingPongDelay';
import { ReverbDevice } from '../engine/device/Reverb';
import { SequencerDevice } from '../engine/device/Sequencer';
import { Slice } from '../engine/device/Slice';
import { CompressorView } from './CompressorView';
import { DeviceChainView } from './DeviceChainView';
import { DistortionView } from './DistortionView';
import { FilterView } from './FilterView';
import { PatternEditor } from './PatternEditor';
import { PingPongDelayView } from './PingPongDelayView';
import { ReverbView } from './ReverbView';
import { SamplerSliceView } from './SamplerSliceView';

// Effects support bypass (a dry pass-through). Sequencer/Slice don't.
const isEffectDevice = (device: Device) =>
  device instanceof FilterDevice ||
  device instanceof PingPongDelayDevice ||
  device instanceof DistortionDevice ||
  device instanceof CompressorDevice ||
  device instanceof ReverbDevice;

export const DeviceView = (props: {
  device: Device;
  onRequestRemoveDevice: (device: Device) => void;
}) => {
  return (
    <Switch
      fallback={() => {
        const collapsed = createSignalFromEventEmitter(
          () => props.device,
          (device) => device.collapsed,
          'collapsedUpdated',
        );
        const bypassed = createSignalFromEventEmitter(
          () => props.device,
          (device) => device.bypassed,
          ['bypassUpdated'],
        );
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
            <div
              classList={{
                [css`
                  display: none;
                `]: !collapsed(),
                [css`
                  cursor: pointer;
                `]: true,
              }}
              onClick={() => props.device.set({ collapsed: false })}
            >
              {props.device.constructor.name.substring(
                0,
                props.device.constructor.name.length - 'Device'.length,
              )}
            </div>
            <div
              classList={{
                device: true,
                [css`
                  display: none;
                `]: collapsed(),
              }}
            >
              <Show when={isEffectDevice(props.device)}>
                <div
                  class={css`
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 2px;
                  `}
                >
                  <button
                    type="button"
                    title={
                      bypassed()
                        ? 'Effect bypassed — click to enable'
                        : 'Bypass effect'
                    }
                    onClick={() =>
                      props.device.set({ bypass: !props.device.bypassed })
                    }
                    class={css`
                      font-size: 10px;
                      font-family: 'Oswald';
                      letter-spacing: 0.05em;
                      text-transform: uppercase;
                      padding: 1px 8px;
                      border-radius: 3px;
                      cursor: pointer;
                      border: 1px solid rgba(0, 0, 0, 0.4);
                      color: ${bypassed() ? '#222' : '#0c2'};
                      background: ${bypassed() ? '#e0a23a' : '#1c1c1c'};
                      box-shadow: ${bypassed()
                        ? 'none'
                        : 'inset 0 0 4px rgba(0, 255, 80, 0.4)'};
                    `}
                  >
                    {bypassed() ? 'Bypassed' : 'Active'}
                  </button>
                </div>
              </Show>
              <div
                class={css`
                  opacity: ${bypassed() ? 0.45 : 1};
                  transition: opacity 0.15s;
                `}
              >
                <Switch>
                  <Match
                    keyed
                    when={props.device instanceof FilterDevice && props.device}
                  >
                    {(device) => <FilterView filter={device} />}
                  </Match>
                  <Match
                    keyed
                    when={
                      props.device instanceof PingPongDelayDevice &&
                      props.device
                    }
                  >
                    {(device) => <PingPongDelayView pingPongDelay={device} />}
                  </Match>
                  <Match
                    keyed
                    when={
                      props.device instanceof DistortionDevice && props.device
                    }
                  >
                    {(device) => <DistortionView distortion={device} />}
                  </Match>
                  <Match
                    keyed
                    when={
                      props.device instanceof DistortionDevice && props.device
                    }
                  >
                    {(device) => <DistortionView distortion={device} />}
                  </Match>
                  <Match
                    keyed
                    when={
                      props.device instanceof CompressorDevice && props.device
                    }
                  >
                    {(device) => <CompressorView compressor={device} />}
                  </Match>
                  <Match
                    keyed
                    when={props.device instanceof ReverbDevice && props.device}
                  >
                    {(device) => <ReverbView reverb={device} />}
                  </Match>
                  <Match
                    keyed
                    when={
                      props.device instanceof SequencerDevice && props.device
                    }
                  >
                    {(device) => <PatternEditor sequencer={device} />}
                  </Match>
                  <Match
                    keyed
                    when={props.device instanceof Slice && props.device}
                  >
                    {(device) => <SamplerSliceView slice={device} />}
                  </Match>
                </Switch>
              </div>
            </div>
          </DeviceWrapper>
        );
      }}
    >
      <Match keyed when={props.device instanceof DeviceChain && props.device}>
        {(deviceChain) => <DeviceChainView deviceChain={deviceChain} />}
      </Match>
    </Switch>
  );
};
