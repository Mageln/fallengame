import { Panel, PanelHeader, Group, Button, Text, Header, Box, Cell } from '@vkontakte/vkui';
import { Icon28ArrowLeftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useGame } from '../game/GameContext';
import { WEAPON_DAMAGE_PER_LEVEL, WEAPON_MAX_LEVEL } from '../game/constants';
import { weaponRepairCost, weaponUpgradeCost, weaponUpgradeUpgradeCost } from '../game/formulas';

interface Props {
  id: string;
}

export const Workshop = ({ id }: Props) => {
  const navigator = useRouteNavigator();
  const { state, dispatch, derived } = useGame();
  const upCost = weaponUpgradeCost(state.weapon.level);
  const repairCost = weaponRepairCost();
  const upgradeUpgradeCost = weaponUpgradeUpgradeCost();
  const weaponTotalDmg = state.weapon.baseDamage + state.weapon.level * WEAPON_DAMAGE_PER_LEVEL + (state.weapon.upgraded ? 5 : 0);

  return (
    <Panel id={id}>
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigator.back()}><Icon28ArrowLeftOutline /></Button>}>
        Мастерская
      </PanelHeader>
      <Group header={<Header>Оружие</Header>}>
        <Cell 
          subtitle={
            state.weapon.broken 
              ? '⚠️ СЛОМАНО: урон не считается' 
              : `Урон оружия: ${weaponTotalDmg}`
          }
          style={{
            borderLeft: state.weapon.broken ? '4px solid #ef4444' : '4px solid #22c55e',
          }}
        >
          <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Text style={{ fontWeight: 'bold' }}>{state.weapon.name}</Text>
              <Text style={{ fontSize: 12, opacity: 0.7 }}>
                Заточка {state.weapon.level}/{WEAPON_MAX_LEVEL}
                {state.weapon.upgraded && <Text style={{ color: '#fbbf24' }}> • ⭐ МОДЕРНИЗИРОВАНО</Text>}
              </Text>
            </Box>
            <Text style={{ fontSize: 24 }}>🔫</Text>
          </Box>
        </Cell>
        
        {/* Weapon stats */}
        <Box style={{ display: 'flex', gap: 12, fontSize: 12, marginTop: 4 }}>
          <Text>Базовый урон: {state.weapon.baseDamage}</Text>
          <Text>Заточка: +{state.weapon.level * WEAPON_DAMAGE_PER_LEVEL}</Text>
          {state.weapon.upgraded && <Text style={{ color: '#fbbf24' }}>Модернизация: +5</Text>}
        </Box>

        <Box>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>
            Каждый уровень: +{WEAPON_DAMAGE_PER_LEVEL} урона. Модернизация: +5 урона. Макс заточки — {WEAPON_MAX_LEVEL}.
          </Text>
        </Box>

        <Box style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button 
            disabled={state.weapon.level >= WEAPON_MAX_LEVEL || state.weapon.broken}
            onClick={() => dispatch({ type: 'UPGRADE_WEAPON' })}
          >
            🔨 Заточить +1 ({upCost} патр.)
          </Button>
          {state.weapon.level >= 5 && !state.weapon.upgraded && !state.weapon.broken && (
            <Button 
              mode="secondary"
              onClick={() => dispatch({ type: 'UPGRADE_WEAPON_UPGRADE' })}
            >
              ⭐ Модернизировать ({upgradeUpgradeCost} патр.)
            </Button>
          )}
          <Button 
            mode="secondary" 
            disabled={!state.weapon.broken}
            onClick={() => dispatch({ type: 'REPAIR_WEAPON' })}
          >
            🔧 Починить ({repairCost} 🔥)
          </Button>
        </Box>
      </Group>

      {/* Tips */}
      <Group header={<Header>Советы</Header>}>
        <Box style={{ fontSize: 12, opacity: 0.8 }}>
          <Text>• Оружие ломается с шансом ~18% при ударе</Text>
          <Text>• Сломанное оружие не даёт урона — почините в мастерской</Text>
          <Text>• Модернизация доступна с 5 уровня заточки</Text>
          <Text>• Урон от оружия + экипировки суммируются</Text>
        </Box>
      </Group>
    </Panel>
  );
};

