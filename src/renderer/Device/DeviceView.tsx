import { Match, Switch } from 'solid-js';
import { DeviceChainView } from './DeviceChainView';

import { css } from '../emotion-solid';
import { Device } from '../engine/device/Device';
import { DeviceChain } from '../engine/device/DeviceChain';
import { FilterDevice } from '../engine/device/Filter';
import { SamplerDevice } from '../engine/device/Sampler';
import { DistortionDevice } from '../engine/device/Distortion';
import { CompressorDevice } from '../engine/device/Compressor';
import { PingPongDelayDevice } from '../engine/device/PingPongDelay';

import { PingPongDelayView } from './PingPongDelayView';

import { SamplerView } from './SamplerView';
import { FilterView } from './FilterView';

import { DistortionView } from './DistortionView';
import { CompressorView } from './CompressorView';
import { ReverbDevice } from '../engine/device/Reverb';
import { ReverbView } from './ReverbView';
import { DeviceWrapper } from '../UI/DeviceWrapper';
import { createSignalFromEventEmitter } from 'renderer/engine/EngineBase';

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
          'collapsedUpdated'
        );
        return (
          <DeviceWrapper
            background={props.device.color}
            classList={{
              device: true,
            }}
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
                props.device.constructor.name.length - 'Device'.length
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
                    <PingPongDelayView
                      pingPongDelay={device}
                    ></PingPongDelayView>
                  )}
                </Match>
                <Match
                  when={
                    props.device instanceof DistortionDevice && props.device
                  }
                >
                  {(device) => (
                    <DistortionView distortion={device}></DistortionView>
                  )}
                </Match>
                <Match
                  when={
                    props.device instanceof DistortionDevice && props.device
                  }
                >
                  {(device) => (
                    <DistortionView distortion={device}></DistortionView>
                  )}
                </Match>
                <Match
                  when={
                    props.device instanceof CompressorDevice && props.device
                  }
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
            </div>
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
