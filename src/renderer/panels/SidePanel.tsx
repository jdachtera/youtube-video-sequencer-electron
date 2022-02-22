import {
  createEffect,
  createSignal,
  For,
  Match,
  Switch,
  untrack,
} from 'solid-js';
import { Engine } from '../engine/Engine';
import { FindSlicesPanel } from './FindSlicesPanel';
import { Column, Row } from '../UI/Grid';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { ButtonGroup } from '../UI/ButtonGroup';
import { YoutubeSearchPanel } from './YoutubeSearchPanel';
import { css } from '@emotion/css';
import { SoundsDotComPanel } from './SoundDotComPanel';

const tabs = ['YouTube', 'SliceDB', 'Sounds.com'] as const;
export type SidePanelTab = typeof tabs[number];

export const SidePanel = (props: { engine: Engine }) => {
  const sidePanelState = props.engine.createStore(
    (engine) => engine.viewMode.sidePanel,
    ['viewModeUpdated']
  );

  const dragHandleWidth = 5;
  const maxWidth = 600;
  const [widthBeforeDragging, setWidthBeforeDragging] = createSignal(
    untrack(() => sidePanelState.width)
  );

  const [isDragging, setIsDragging] = createSignal(false);

  const handleMouseMove = (event: MouseEvent) => {
    props.engine.set({
      viewMode: {
        sidePanel: {
          width: Math.max(
            Math.min(sidePanelState.width + event.movementX, maxWidth),
            dragHandleWidth
          ),
        },
      },
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (sidePanelState.width === dragHandleWidth) {
      props.engine.set({
        viewMode: {
          sidePanel: {
            width: widthBeforeDragging(),
            open: false,
          },
        },
      });
    }
  };

  createEffect(() => {
    if (isDragging()) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  });

  return (
    <Row
      class={css`
        background-color: #4b4b4b;
        font-family: 'oswald';
      `}
      style={{
        width: `${
          sidePanelState.open ? sidePanelState.width : dragHandleWidth
        }px`,
      }}
      overflow={'hidden'}
    >
      <Column flex={1} overflow={'hidden'}>
        <ButtonGroup>
          <For each={tabs}>
            {(tab) => (
              <ButtonWithLabel
                label={tab}
                labelOnButton
                activated={tab === sidePanelState.activeTab}
                onClick={() =>
                  props.engine.set({
                    viewMode: { sidePanel: { activeTab: tab } },
                  })
                }
              />
            )}
          </For>
        </ButtonGroup>
        <Switch>
          <Match when={sidePanelState.activeTab === 'YouTube'}>
            <YoutubeSearchPanel engine={props.engine} />
          </Match>
          <Match when={sidePanelState.activeTab === 'SliceDB'}>
            <FindSlicesPanel engine={props.engine} />
          </Match>
          <Match when={sidePanelState.activeTab === 'Sounds.com'}>
            <SoundsDotComPanel engine={props.engine} />
          </Match>
        </Switch>
      </Column>{' '}
      <Column
        class={css`
          cursor: col-resize;
        `}
        onMouseDown={() => {
          if (!sidePanelState.open) return;
          event?.preventDefault();
          setWidthBeforeDragging(sidePanelState.width);
          setIsDragging(true);
        }}
        onClick={() => {
          if (isDragging()) return;
          props.engine.set({
            viewMode: { sidePanel: { open: !sidePanelState.open } },
          });
        }}
        width={`${dragHandleWidth}px`}
      ></Column>
    </Row>
  );
};
