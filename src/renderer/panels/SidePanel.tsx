import { createSignal, For, Match, Switch } from 'solid-js';
import { Engine } from '../engine/Engine';
import { FindSlicesPanel } from './FindSlicesPanel';
import { Column, Row } from '../UI/Grid';
import { ButtonWithLabel } from '../UI/ButtonWithLabel';
import { ButtonGroup } from '../UI/ButtonGroup';
import { YoutubeSearchPanel } from './YoutubeSearchPanel';

export const SidePanel = (props: { engine: Engine }) => {
  const tabs = ['YouTube', 'SliceDB'] as const;

  const [activeTab, setActiveTab] = createSignal<typeof tabs[number]>(tabs[0]);

  return (
    <Row width={'300px'} overflow={'hidden'}>
      <Column flex={1} overflow={'hidden'}>
        <ButtonGroup>
          <For each={tabs}>
            {(tab) => (
              <ButtonWithLabel
                label={tab}
                labelOnButton
                activated={tab === activeTab()}
                onClick={() => setActiveTab(tab)}
              />
            )}
          </For>
        </ButtonGroup>
        <Switch>
          <Match when={activeTab() === 'YouTube'}>
            <YoutubeSearchPanel engine={props.engine} />
          </Match>
          <Match when={activeTab() === 'SliceDB'}>
            <FindSlicesPanel engine={props.engine} />
          </Match>
        </Switch>
      </Column>{' '}
      <Column width={'5px'}></Column>
    </Row>
  );
};
