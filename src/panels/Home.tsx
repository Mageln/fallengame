import { Panel, PanelHeader, Group, Button, Text, Title, Avatar, Div } from '@vkontakte/vkui';
import { Icon28User } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FallenCanvas } from '../components/FallenCanvas/FallenCanvas';
import { useGame } from '../game/GameContext';
import { DISTRICT_TASKS, DISTRICTS, TUTORIAL } from '../game/constants';
import { carUpgradeCost, getDistrict } from '../game/formulas';

interface HomeProps {
  id: string;
  userName?: string;
  setShowMap?: (show: boolean) => void;
}

export const Home = ({ id, userName, setShowMap }: HomeProps) => {
  const navigator = useRouteNavigator();
  const { state, dispatch, derived } = useGame();
  const district = getDistrict(state.currentDistrict);
  const carCost = carUpgradeCost(state.carLevel);
  const inTutorial = state.tutorialStep >= 0;

  const openBattle = (districtId: string) => {
    dispatch({ type: 'START_BOSS', districtId });
    navigator.push('/battle');
  };

  return (
    <Panel id={id}>
      <PanelHeader
        before={
          <Avatar size={36} onClick={() => navigator.push('/profile')} style={{ cursor: 'pointer' }}>
            <Icon28User />
          </Avatar>
        }
        after={<Button size="s" onClick={() => navigator.push('/profile')}>Профиль</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Title level="3">{userName || 'Выживший'}</Title>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>
            Эргейт • ур. {state.level} • вын. {derived.stamina} • урон {derived.damage}
          </Text>
        </div>
      </PanelHeader>

      <Group>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
          <Text>🔫 {state.bullets}</Text>
          <Text>🔥 {state.matches}</Text>
          <Text>🪙 {state.gold}</Text>
          <Text>🎫 {state.zhetons}</Text>
          <Text>⚡ {state.energy}/{state.maxEnergy}</Text>
          <Text>💣 {state.grenades}</Text>
          <Text>💊 {state.medkits}</Text>
          <Text>📦 {state.inventory.length}/20</Text>
        </Div>
      </Group>

      {state.lastMessage && (
        <Group>
          <Div>
            <Text>{state.lastMessage}</Text>
            {inTutorial && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button size="s" onClick={() => dispatch({ type: 'NEXT_TUTORIAL' })}>
                  Далее ({state.tutorialStep + 1}/{TUTORIAL.length})
                </Button>
                <Button size="s" mode="tertiary" onClick={() => dispatch({ type: 'SKIP_TUTORIAL' })}>
                  Пропустить
                </Button>
              </div>
            )}
          </Div>
        </Group>
      )}

      <Group>
        <Div>
          <Text>Карта Эргейта — {district?.name}</Text>
          <Text style={{ fontSize: 12, opacity: 0.75 }}>
            Город оцеплен стеной. Новые районы открывает уровень машины.
          </Text>
        </Div>
        <Div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DISTRICTS.map((item) => {
            const locked = state.carLevel < item.carLevel;
            const active = state.currentDistrict === item.id;
            return (
              <Button
                key={item.id}
                size="s"
                mode={active ? 'primary' : 'secondary'}
                disabled={locked}
                onClick={() => dispatch({ type: 'ENTER_DISTRICT', districtId: item.id })}
              >
                {item.name} {locked ? `(авто ${item.carLevel})` : ''}
              </Button>
            );
          })}
        </Div>
      </Group>

      <Group>
        <FallenCanvas
          onTaskComplete={(taskId) => dispatch({ type: 'DO_TASK', taskId })}
          onResourceClick={() => undefined}
          onZombieClick={() => district && openBattle(district.id)}
          energy={state.energy}
          maxEnergy={state.maxEnergy}
          authority={derived.stamina}
          spicki={state.matches}
          bullets={state.bullets}
          gold={state.gold}
          zhetons={state.zhetons}
          zombieHealth={district?.bossHp ?? 80}
          maxZombieHealth={district?.bossHp ?? 80}
          isZombieAlive
          playerName={userName || 'Выживший'}
          level={state.level}
          status={district?.bossName ?? ''}
          appearance={state.appearance}
          tasks={DISTRICT_TASKS[state.currentDistrict] ?? DISTRICT_TASKS.southgate}
        />
      </Group>

      <Group>
        <Div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={() => dispatch({ type: 'UPGRADE_CAR' })}>
            🚗 Авто {state.carLevel} ({carCost.energy}⚡ {carCost.matches}🔥)
          </Button>
          <Button mode="secondary" onClick={() => district && openBattle(district.id)}>
            Босс: {district?.bossName}
          </Button>
          <Button mode="secondary" onClick={() => navigator.push('/workshop')}>
            🔧 Мастерская
          </Button>
        </Div>
        <Div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="s" onClick={() => navigator.push('/raid')}>Рейды</Button>
          <Button size="s" onClick={() => navigator.push('/clan')}>Клан</Button>
          <Button size="s" disabled={state.daily.lotteryUsed} onClick={() => dispatch({ type: 'LOTTERY' })}>
            Лотерея
          </Button>
          <Button size="s" disabled={state.daily.goldClaimed} onClick={() => dispatch({ type: 'CLAIM_DAILY' })}>
            Золото за вход
          </Button>
          <Button size="s" onClick={() => navigator.push('/inventory')}>
            📦 Инвентарь ({state.inventory.length})
          </Button>
          <Button size="s" onClick={() => navigator.push('/quests')}>
            📋 Квесты ({derived.completedQuests})
          </Button>
          <Button size="s" onClick={() => navigator.push('/crafting')}>
            🔨 Крафт
          </Button>
          {setShowMap && (
            <Button size="s" onClick={() => setShowMap(true)}>
              🗺️ Карта
            </Button>
          )}
          <Button size="s" onClick={() => dispatch({ type: 'SEARCH_FRIEND' })}>Обыск друзей</Button>
          <Button size="s" onClick={() => dispatch({ type: 'RADIO_HELP' })}>
            Рация ({state.radioRequests.length})
          </Button>
          {state.gast.active && (
            <Button
              size="s"
              appearance="negative"
              onClick={() => {
                dispatch({ type: 'START_GAST' });
                navigator.push('/battle');
              }}
            >
              Гаст в {getDistrict(state.gast.districtId ?? '')?.name}
            </Button>
          )}
        </Div>
      </Group>
    </Panel>
  );
};
