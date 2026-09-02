import { useState, useMemo } from 'react';
import { FallenCanvas } from '../components/FallenCanvas/FallenCanvas';
import { useGame } from '../game/GameContext';
import { DISTRICT_TASKS, DISTRICTS } from '../game/constants';
import { getDistrict } from '../game/formulas';

interface HomeProps {
  id: string;
  userName?: string;
}

export const Home = ({ id }: HomeProps) => {
  const { state, dispatch, derived } = useGame();
  const district = getDistrict(state.currentDistrict);
  const [showProfile, setShowProfile] = useState(false);

  const openBattle = (districtId: string) => {
    dispatch({ type: 'START_BOSS', districtId });
  };

  // Данные для профиля (memoized чтобы не вызывать бесконечный rerender)
  const profileData = useMemo(() => ({
    level: state.level,
    stamina: derived.stamina,
    damage: derived.damage,
    luck: derived.luck,
    crit: derived.crit,
    gold: state.gold,
    spicki: state.matches,
    bullets: state.bullets,
    zhetons: state.zhetons,
    appearance: state.appearance,
    carLevel: state.carLevel,
    weapon: state.weapon,
  }), [state.level, derived.stamina, derived.damage, derived.luck, derived.crit,
       state.gold, state.matches, state.bullets, state.zhetons,
       state.appearance, state.carLevel, state.weapon]);

  return (
    <div id={id} style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <FallenCanvas
        onTaskComplete={(taskId) => dispatch({ type: 'DO_TASK', taskId })}
        onResourceClick={() => {}}
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
        appearance={state.appearance}
        tasks={DISTRICT_TASKS[state.currentDistrict] ?? DISTRICT_TASKS.southgate}
        showMap={state.showMap}
        onMapToggle={() => dispatch({ type: 'TOGGLE_MAP' })}
        currentLocation={state.currentLocation}
        carLevel={state.carLevel}
        level={state.level}
        currentDistrict={state.currentDistrict}
        districtName={district?.name || ''}
        onBattle={() => district && openBattle(district.id)}
        onGoProfile={() => setShowProfile(true)}
        onGoWorkshop={() => {}}
        onGoRaid={() => {}}
        onGoClan={() => {}}
        onGoInventory={() => {}}
        onGoQuests={() => {}}
        onGoCrafting={() => {}}
        onLottery={() => dispatch({ type: 'LOTTERY' })}
        onClaimDaily={() => dispatch({ type: 'CLAIM_DAILY' })}
        // Профиль
        showProfile={showProfile}
        profileData={profileData}
        onProfileClose={() => setShowProfile(false)}
        onBattleClick={() => {
          setShowProfile(false);
          district && openBattle(district.id);
        }}
        onFriendsClick={() => {
          setShowProfile(false);
          // TODO: открыть друзей
        }}
        onArenaClick={() => {
          setShowProfile(false);
          // TODO: открыть арену
        }}
      />
    </div>
  );
};
