import { Panel, PanelHeader, Group, Button, Text, Header, Box, Cell } from '@vkontakte/vkui';
import { Icon28ArrowLeftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useGame } from '../game/GameContext';
import { RAIDS } from '../game/constants';

interface Props {
  id: string;
}

const RAID_ICONS: Record<string, string> = {
  house: '🏚️',
  hospital: '🏥',
  warehouse: '🏭',
  marauder_base: '🔥',
  military_outpost: '🎖️',
  government_bunker: '🔒',
};

const RAID_DIFFICULTY: Record<string, string> = {
  house: 'Легко',
  hospital: 'Легко',
  warehouse: 'Средне',
  marauder_base: 'Сложно',
  military_outpost: 'Сложно',
  government_bunker: 'Экстрим',
};

export const Raid = ({ id }: Props) => {
  const navigator = useRouteNavigator();
  const { state, dispatch } = useGame();

  return (
    <Panel id={id}>
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigator.back()}><Icon28ArrowLeftOutline /></Button>}>
        Рейды
      </PanelHeader>
      <Group>
        <Text>Рейды — лучший источник сырья и экипировки. Собирайте ящики для уникальных предметов!</Text>
      </Group>
      <Group header={<Header>Доступные рейды</Header>}>
        {RAIDS.map((raid) => {
          const isHighDrop = raid.id === 'marauder_base' || raid.id === 'military_outpost' || raid.id === 'government_bunker';
          const icon = RAID_ICONS[raid.id] || '🏚️';
          const difficulty = RAID_DIFFICULTY[raid.id] || 'Норм';
          
          return (
            <Cell
              key={raid.id}
              subtitle={`${raid.energy} ⚡ | 🔥+${raid.matches} 💣+${raid.grenades} 💊+${raid.medkits} ${isHighDrop ? '• Повышенный дроп!' : ''}`}
              after={
                <Button size="s" onClick={() => dispatch({ type: 'START_RAID', raidId: raid.id })}>
                  Войти
                </Button>
              }
            >
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
                <Box>
                  <Text style={{ fontWeight: 'bold' }}>{raid.name}</Text>
                  <Text style={{ fontSize: 10, opacity: 0.6 }}>
                    Сложность: {difficulty}
                  </Text>
                </Box>
              </Box>
            </Cell>
          );
        })}
      </Group>
      {state.raid && (
        <Group header={<Header>Текущий рейд</Header>}>
          <Box>
            <Text style={{ fontWeight: 'bold' }}>
              {RAIDS.find((r) => r.id === state.raid?.raidId)?.name}
            </Text>
            <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              {state.raid.scouted 
                ? (state.raid.pathClear ? 'Путь чист! Собирайте ящики.' : 'Сильный босс на пути!')
                : 'Сначала разведка до выхода.'}
            </Text>
          </Box>
          <Box style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <Button disabled={state.raid.scouted} onClick={() => dispatch({ type: 'RAID_SCOUT' })}>
              🔍 Разведка
            </Button>
            {!state.raid.pathClear && state.raid.scouted && (
              <Button mode="secondary" onClick={() => dispatch({ type: 'RAID_BYPASS' })}>
                🚶 Обойти (10⚡)
              </Button>
            )}
            <Button 
              mode="secondary" 
              disabled={!state.raid.scouted || !state.raid.pathClear || state.raid.cratesLooted}
              onClick={() => dispatch({ type: 'RAID_LOOT' })}
            >
              📦 Собрать ящики
            </Button>
            <Button mode="tertiary" onClick={() => dispatch({ type: 'LEAVE_RAID' })}>
              🚪 Выйти
            </Button>
          </Box>
        </Group>
      )}
    </Panel>
  );
};

