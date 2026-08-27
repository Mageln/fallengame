import { Panel, PanelHeader, Group, Button, Text, Header, Div, Input } from '@vkontakte/vkui';
import { Icon28ArrowLeftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { CLAN_CREATE_GOLD, CLAN_CREATE_LEVEL, CLAN_JOIN_LEVEL, CLAN_MAX_MEMBERS } from '../game/constants';

interface Props {
  id: string;
}

export const Clan = ({ id }: Props) => {
  const navigator = useRouteNavigator();
  const { state, dispatch } = useGame();
  const [name, setName] = useState('Стена');

  return (
    <Panel id={id}>
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigator.back()}><Icon28ArrowLeftOutline /></Button>}>
        Клан
      </PanelHeader>
      <Group>
        <Div>
          <Text>Базу не строят. Клан: вход с {CLAN_JOIN_LEVEL} ур., создание с {CLAN_CREATE_LEVEL} за {CLAN_CREATE_GOLD} золота, до {CLAN_MAX_MEMBERS} человек. Очки — сумма опыта.</Text>
        </Div>
        {state.clan ? (
          <Div>
            <Text>{state.clan.name}</Text>
            <Text>Участников: {state.clan.members}/{CLAN_MAX_MEMBERS}</Text>
            <Text>Очки: {state.clan.score}</Text>
          </Div>
        ) : (
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button onClick={() => dispatch({ type: 'JOIN_CLAN' })}>Вступить</Button>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button mode="secondary" onClick={() => dispatch({ type: 'CREATE_CLAN', name })}>
              Создать за {CLAN_CREATE_GOLD} золота
            </Button>
          </Div>
        )}
      </Group>
    </Panel>
  );
};
