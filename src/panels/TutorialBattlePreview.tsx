import { useMemo } from 'react';
import { GameContext, useGame } from '../game/GameContext';
import { createInitialState } from '../game/initialState';
import { gameReducer } from '../game/reducer';
import { BossFightPanel } from './Boss';

const examples: Record<string, { energy: number; bossHp: number; playerHp: number }> = {
  fist: { energy: 0, bossHp: 100, playerHp: 100 }, weapon: { energy: 20, bossHp: 90, playerHp: 90 },
  'fist-block': { energy: 10, bossHp: 80, playerHp: 80 }, block: { energy: 30, bossHp: 70, playerHp: 70 },
  'fist-heal-1': { energy: 10, bossHp: 70, playerHp: 65 }, 'fist-heal-2': { energy: 30, bossHp: 65, playerHp: 60 },
  heal: { energy: 50, bossHp: 60, playerHp: 55 }, rage: { energy: 0, bossHp: 50, playerHp: 90 },
};

// Read-only copy of the real battle UI. Its dispatch never touches the real game.
export const TutorialBattlePreview = ({ stepId }: { stepId: string }) => {
  const context = useGame();
  const battle = useMemo(() => gameReducer(createInitialState(), { type: 'START_BOSS_FIGHT', bossId: 'zombie' }).battle, []);
  const example = examples[stepId];
  if (!battle || !example) return null;
  const state = { ...context.state, battleVisible: true, battle: { ...battle, bossHp: example.bossHp, bossMaxHp: 100,
    playerHp: example.playerHp, playerMaxHp: 100, bossEnergy: example.energy } };
  return <GameContext.Provider value={{ ...context, state, dispatch: () => {} }}><BossFightPanel /></GameContext.Provider>;
};
