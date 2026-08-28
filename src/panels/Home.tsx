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
}

export const Home = ({ id, userName }: HomeProps) => {
  const navigator = useRouteNavigator();
  const { state, dispatch, derived } = useGame();
  const district = getDistrict(state.currentDistrict);
  const inTutorial = state.tutorialStep >= 0;

  const openBattle = (districtId: string) => {
    dispatch({ type: 'START_BOSS', districtId });
    navigator.push('/battle');
  };

  // Получаем заблокированные районы для отображения в overlay
  const lockedDistricts = DISTRICTS
    .filter(d => state.carLevel < d.carLevel)
    .map(d => ({ id: d.id, name: d.name, carLevel: d.carLevel }));

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
          showMap={state.showMap}
          onMapToggle={() => dispatch({ type: 'TOGGLE_MAP' })}
          currentLocation={state.currentLocation}
          onLocationChange={(locId) => dispatch({ type: 'CHANGE_LOCATION', locationId: locId })}
          carLevel={state.carLevel}
          currentDistrict={state.currentDistrict}
          districtName={district?.name || ''}
          onEnterDistrict={(distId) => dispatch({ type: 'ENTER_DISTRICT', districtId: distId })}
          onUpgradeCar={() => dispatch({ type: 'UPGRADE_CAR' })}
          onBattle={() => district && openBattle(district.id)}
          onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
          soundEnabled={state.soundEnabled}
          onGoProfile={() => navigator.push('/profile')}
          onGoWorkshop={() => navigator.push('/workshop')}
          onGoRaid={() => navigator.push('/raid')}
          onGoClan={() => navigator.push('/clan')}
          onGoInventory={() => navigator.push('/inventory')}
          onGoQuests={() => navigator.push('/quests')}
          onGoCrafting={() => navigator.push('/crafting')}
          onLottery={() => dispatch({ type: 'LOTTERY' })}
          onClaimDaily={() => dispatch({ type: 'CLAIM_DAILY' })}
          onSearchFriend={() => dispatch({ type: 'SEARCH_FRIEND' })}
          onRadioHelp={() => dispatch({ type: 'RADIO_HELP' })}
          completedQuests={derived.completedQuests}
          radioRequests={state.radioRequests.length}
          daily={state.daily}
          lockedDistricts={lockedDistricts}
        />
      </Group>
    </Panel>
  );
};
