import { useState } from 'react';
import { FallenCanvas } from '../components/FallenCanvas/FallenCanvas';
import { useGame } from '../game/GameContext';
import { DISTRICT_TASKS } from '../game/constants';
import { getDistrict } from '../game/formulas';
import { InventoryPanel } from './InventoryPanel';

interface HomeProps {
  id: string;
  userName?: string;
}

export const Home = ({ id }: HomeProps) => {
  const { state, dispatch, derived } = useGame();
  const district = getDistrict(state.currentDistrict);
  const [showInventory, setShowInventory] = useState(false);

  const openBattle = (districtId: string) => {
    dispatch({ type: 'START_BOSS', districtId });
  };

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
        showBossModal={state.showBossModal}
        currentLocation={state.currentLocation}
        carLevel={state.carLevel}
        level={state.level}
        currentDistrict={state.currentDistrict}
        districtName={district?.name || ''}
        onBattle={() => district && openBattle(district.id)}
        onGoProfile={() => setShowInventory(true)}
        onGoWorkshop={() => {}}
        onGoRaid={() => {}}
        onGoClan={() => {}}
        onGoInventory={() => setShowInventory(true)}
        onGoQuests={() => {}}
        onGoCrafting={() => {}}
        onLottery={() => dispatch({ type: 'LOTTERY' })}
        onClaimDaily={() => dispatch({ type: 'CLAIM_DAILY' })}
        onOpenBossModal={() => dispatch({ type: 'TOGGLE_BOSS_MODAL' })}
        onBattleClick={() => {
          setShowInventory(false);
          district && openBattle(district.id);
        }}
        onFriendsClick={() => {
          setShowInventory(false);
          // TODO: открыть друзей
        }}
        onArenaClick={() => {
          setShowInventory(false);
          // TODO: открыть арену
        }}
      />
      {showInventory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.75)',
            cursor: 'pointer',
          }}
          onClick={() => setShowInventory(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              cursor: 'default',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <InventoryPanel onClose={() => setShowInventory(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
