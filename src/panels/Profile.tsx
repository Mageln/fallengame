import { Panel, PanelHeader, Group, Button, Text, Header, Cell, Avatar, Box, Card } from '@vkontakte/vkui';
import { Icon28ArrowLeftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useGame } from '../game/GameContext';
import { APPEARANCES, INVENTORY_ITEMS } from '../game/constants';
import { RARITY_COLORS, RARITY_NAMES } from '../game/types';
import { luckUpgradeCost, levelUpCost, staminaPerBullet, staminaUpgradeCost } from '../game/formulas';
import type { Rarity } from '../game/types';

interface Props {
  id: string;
}

export const Profile = ({ id }: Props) => {
  const navigator = useRouteNavigator();
  const { state, dispatch, derived } = useGame();
  const lvlCost = levelUpCost(state.level);
  const stamCost = staminaUpgradeCost(state.baseStamina);
  const luckCost = luckUpgradeCost(state.luck);
  const stamRate = staminaPerBullet(state);

  const getEquipInfo = (item: typeof INVENTORY_ITEMS[0]) => {
    const owned = state.equipmentIds.includes(item.id);
    const per = item.staminaBonus > 0 ? (item.costBullets / item.staminaBonus).toFixed(1) : '—';
    return { owned, per };
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigator.back()}><Icon28ArrowLeftOutline /></Button>}>
        Профиль
      </PanelHeader>

      {/* Quick stats */}
      <Group>
        <Box style={{ 
          background: '#1a1a2e', 
          borderRadius: 12, 
          padding: 16,
          border: '1px solid #333',
        }}>
          <Box style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 8 }}>
            <Box style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>⚡{derived.stamina}</Text>
              <Text style={{ fontSize: 10, opacity: 0.6 }}>Выносливость</Text>
            </Box>
            <Box style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#ef4444' }}>⚔{derived.damage}</Text>
              <Text style={{ fontSize: 10, opacity: 0.6 }}>Урон</Text>
            </Box>
            <Box style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fbbf24' }}>🍀{derived.luck}</Text>
              <Text style={{ fontSize: 10, opacity: 0.6 }}>Удача</Text>
            </Box>
            <Box style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{(derived.crit * 100).toFixed(1)}%</Text>
              <Text style={{ fontSize: 10, opacity: 0.6 }}>Крит</Text>
            </Box>
          </Box>
        </Box>
      </Group>

      {/* Appearance */}
      <Group header={<Header>Внешность</Header>}>
        <Box style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {APPEARANCES.map((item) => (
            <Button
              key={item.id}
              size="s"
              mode={state.appearance === item.id ? 'primary' : 'secondary'}
              onClick={() => dispatch({ type: 'SET_APPEARANCE', appearance: item.id })}
              style={{ borderLeft: `3px solid ${item.color}` }}
            >
              {item.name}
            </Button>
          ))}
        </Box>
      </Group>

      {/* Level up */}
      <Group header={<Header>Прокачка за патроны</Header>}>
        <Cell
          subtitle={`Цена ${lvlCost} патронов, +3 золота`}
          after={<Button size="s" onClick={() => dispatch({ type: 'UPGRADE_LEVEL' })}>Повысить</Button>}
        >
          Уровень {state.level}
        </Cell>
        <Cell
          subtitle={`Цена от базы (${state.baseStamina}): ${stamCost} патронов / +5. Профиль ${stamRate.toFixed(1)} за вын.`}
          after={<Button size="s" onClick={() => dispatch({ type: 'UPGRADE_STAMINA' })}>Качать</Button>}
        >
          Базовая выносливость {state.baseStamina} → в бою {derived.stamina}
        </Cell>
        <Cell
          subtitle={`${luckCost} патронов. Крит ${(derived.crit * 100).toFixed(1)}%. Цель 1100–1200`}
          after={<Button size="s" onClick={() => dispatch({ type: 'UPGRADE_LUCK' })}>Качать</Button>}
        >
          Удача {state.luck} (итого {derived.luck})
        </Cell>
        <Box style={{ 
          background: derived.damage ? '#1a1a2e' : '#222',
          borderRadius: 8, 
          padding: 10,
          marginTop: 4,
        }}>
          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Боевой урон</Text>
            <Text style={{ fontWeight: 'bold', color: '#ef4444' }}>{derived.damage}</Text>
          </Box>
          <Text style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
            {state.weapon.broken ? '⚠️ Оружие сломано!' : `Оружие: ${state.weapon.name} +${state.weapon.level}`}
          </Text>
        </Box>
      </Group>

      {/* Equipment shop */}
      <Group header={<Header>Магазин экипировки</Header>}>
        {INVENTORY_ITEMS.filter((item) => !['scrap_metal', 'leather', 'gun_parts', 'explosives', 'med_components', 'rare_crystal'].includes(item.id)).map((item) => {
          const { owned, per } = getEquipInfo(item);
          const rarityColor = RARITY_COLORS[item.rarity as Rarity] || '#999';
          
          return (
            <Card
              key={item.id}
              style={{
                borderLeft: `4px solid ${rarityColor}`,
                padding: 10,
                marginBottom: 6,
                opacity: owned ? 0.6 : 1,
              }}
            >
              <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Text style={{ fontWeight: 'bold', color: rarityColor }}>
                    {item.icon} {item.name}
                  </Text>
                  <Text style={{ fontSize: 10, opacity: 0.6 }}>{RARITY_NAMES[item.rarity as Rarity]}</Text>
                </Box>
                <Button size="s" disabled={owned} onClick={() => dispatch({ type: 'BUY_EQUIPMENT', itemId: item.id })}>
                  {owned ? '✅' : `${item.costBullets} 🔫`}
                </Button>
              </Box>
              <Box style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11 }}>
                {item.staminaBonus > 0 && <Text>⚡+{item.staminaBonus}</Text>}
                {item.damageBonus > 0 && <Text>⚔+{item.damageBonus}</Text>}
                {item.luckBonus > 0 && <Text>🍀+{item.luckBonus}</Text>}
                <Text style={{ opacity: 0.5 }}>Цена/вын: {per}</Text>
              </Box>
            </Card>
          );
        })}
      </Group>

      <Group>
        <Button mode="secondary" onClick={() => navigator.push('/inventory')}>
          📦 Открыть инвентарь ({state.inventory.length}/20)
        </Button>
      </Group>
    </Panel>
  );
};

