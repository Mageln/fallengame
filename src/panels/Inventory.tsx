import { Panel, PanelHeader, Group, Button, Text, Header, Box, Card, CellButton } from '@vkontakte/vkui';
import { Icon28ArrowLeftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useGame } from '../game/GameContext';
import { INVENTORY_ITEMS } from '../game/constants';
import { RARITY_COLORS, RARITY_NAMES } from '../game/types';
import type { Rarity } from '../game/types';

interface Props {
  id: string;
}

export const Inventory = ({ id }: Props) => {
  const navigator = useRouteNavigator();
  const { state, dispatch, derived } = useGame();

  const handleEquip = (slotIndex: number) => {
    const slot = state.inventory[slotIndex];
    if (slot && !slot.equipped) {
      dispatch({ type: 'EQUIP_ITEM', slotIndex });
    } else if (slot && slot.equipped) {
      dispatch({ type: 'UNEQUIP_ITEM', slotIndex });
    }
  };

  // Separate inventory into equipped and unequipped
  const unequipped = state.inventory
    .map((slot, index) => ({ ...slot, index }))
    .filter((s) => !s.equipped);

  const equipped = state.inventory
    .map((slot, index) => ({ ...slot, index }))
    .filter((s) => s.equipped);

  return (
    <Panel id={id}>
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigator.back()}><Icon28ArrowLeftOutline /></Button>}>
        Инвентарь ({state.inventory.length}/{20})
      </PanelHeader>

      {/* Equipped items */}
      <Group header={<Header>Надето</Header>}>
        {derived.equippedItems.length > 0 ? (
          <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {derived.equippedItems.map((item) => {
              const slot = equipped.find((s) => s.itemId === item.id);
              return (
                <Card
                  key={item.id}
                  style={{
                    borderLeft: `4px solid ${RARITY_COLORS[item.rarity as Rarity] || '#999'}`,
                    padding: 12,
                  }}
                >
                  <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                    <Button
                      size="s"
                      mode="tertiary"
                      onClick={() => slot && dispatch({ type: 'UNEQUIP_ITEM', slotIndex: slot.index })}
                    >
                      Снять
                    </Button>
                  </Box>
                  <Text style={{ fontSize: 11, opacity: 0.6 }}>{RARITY_NAMES[item.rarity as Rarity]}</Text>
                </Card>
              );
            })}
          </Box>
        ) : (
          <Text style={{ opacity: 0.5 }}>Нет надетых предметов</Text>
        )}
      </Group>

      {/* Unequipped items */}
      <Group header={<Header>Рюкзак</Header>}>
        {unequipped.length > 0 ? (
          <Box style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unequipped.map((slot) => {
              const item = INVENTORY_ITEMS.find((i) => i.id === slot.itemId);
              if (!item) return null;
              const rarityColor = RARITY_COLORS[item.rarity as Rarity] || '#999';
              const isRawMaterial = ['scrap_metal', 'leather', 'gun_parts', 'explosives', 'med_components', 'rare_crystal'].includes(item.id);
              
              return (
                <Card
                  key={slot.index}
                  style={{
                    borderLeft: `4px solid ${rarityColor}`,
                    padding: 10,
                  }}
                >
                  <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                      <Box>
                        <Text style={{ fontWeight: 'bold', color: rarityColor }}>{item.name}</Text>
                        <Text style={{ fontSize: 10, opacity: 0.6 }}>{RARITY_NAMES[item.rarity as Rarity]}{isRawMaterial ? ' • Сырьё' : ''}</Text>
                      </Box>
                    </Box>
                    {!isRawMaterial ? (
                      <Button size="s" onClick={() => handleEquip(slot.index)}>
                        Надеть
                      </Button>
                    ) : (
                      <Text style={{ fontSize: 11, opacity: 0.5 }}>Крафт</Text>
                    )}
                  </Box>
                  {!isRawMaterial && (
                    <Box style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11 }}>
                      {item.staminaBonus > 0 && <Text>⚡+{item.staminaBonus}</Text>}
                      {item.damageBonus > 0 && <Text>⚔+{item.damageBonus}</Text>}
                      {item.luckBonus > 0 && <Text>🍀+{item.luckBonus}</Text>}
                    </Box>
                  )}
                </Card>
              );
            })}
          </Box>
        ) : (
          <Text style={{ opacity: 0.5 }}>Рюкзак пуст. Заходите в рейды и убивайте боссов!</Text>
        )}
      </Group>

      <Group>
        <CellButton onClick={() => navigator.push('/crafting')}>🔨 Перейти к крафту</CellButton>
      </Group>
    </Panel>
  );
};
