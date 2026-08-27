import { Panel, PanelHeader, Group, Button, Text, Header, Div, Card } from '@vkontakte/vkui';
import { Icon28ArrowLeftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useGame } from '../game/GameContext';
import { CRAFTING_RECIPES, INVENTORY_ITEMS } from '../game/constants';
import { RARITY_COLORS, RARITY_NAMES } from '../game/types';
import type { Rarity } from '../game/types';

interface Props {
  id: string;
}

export const Crafting = ({ id }: Props) => {
  const navigator = useRouteNavigator();
  const { state, dispatch } = useGame();

  const getInventoryCount = (itemId: string): number => {
    if (itemId === 'matches') return state.matches;
    if (itemId === 'zhetons') return state.zhetons;
    return state.inventory.filter((s) => s.itemId === itemId && !s.equipped).length;
  };

  const canCraft = (recipe: typeof CRAFTING_RECIPES[0]): boolean => {
    for (const cost of recipe.cost) {
      if (getInventoryCount(cost.itemId) < cost.count) return false;
    }
    return true;
  };

  const handleCraft = (recipeId: string) => {
    dispatch({ type: 'CRAFT_ITEM', recipeId });
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigator.back()}><Icon28ArrowLeftOutline /></Button>}>
        Крафт
      </PanelHeader>

      <Group>
        <Div>
          <Text>Создавайте снаряжение из сырья!</Text>
          <Text style={{ fontSize: 12, opacity: 0.6 }}>
            Сырьё падает с боссов и в рейдах. Скрафтите лучшее снаряжение.
          </Text>
        </Div>
      </Group>

      {/* Raw materials */}
      <Group header={<Header>Сырьё</Header>}>
        <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
          {['scrap_metal', 'leather', 'gun_parts', 'explosives', 'med_components', 'rare_crystal'].map((id) => {
            const item = INVENTORY_ITEMS.find((i) => i.id === id);
            if (!item) return null;
            const count = id === 'scrap_metal' ? state.inventory.filter((s) => s.itemId === id && !s.equipped).length
              : id === 'leather' ? state.inventory.filter((s) => s.itemId === id && !s.equipped).length
              : id === 'gun_parts' ? state.inventory.filter((s) => s.itemId === id && !s.equipped).length
              : id === 'explosives' ? state.inventory.filter((s) => s.itemId === id && !s.equipped).length
              : id === 'med_components' ? state.inventory.filter((s) => s.itemId === id && !s.equipped).length
              : state.inventory.filter((s) => s.itemId === id && !s.equipped).length;
            return (
              <Div key={id} style={{ background: '#222', padding: '6px 10px', borderRadius: 8 }}>
                {item.icon} {count}
              </Div>
            );
          })}
          <Div style={{ background: '#222', padding: '6px 10px', borderRadius: 8 }}>🔥 {state.matches}</Div>
          <Div style={{ background: '#222', padding: '6px 10px', borderRadius: 8 }}>🎫 {state.zhetons}</Div>
        </Div>
      </Group>

      {/* Recipes */}
      <Group header={<Header>Рецепты</Header>}>
        {CRAFTING_RECIPES.map((recipe) => {
          const unlocked = state.craftingRecipes.includes(recipe.id);
          const available = canCraft(recipe);

          if (!unlocked && recipe.id !== 'repair_kit' && recipe.id !== 'medkit_bundle') {
            return (
              <Card key={recipe.id} style={{ padding: 12, marginBottom: 8, opacity: 0.5 }}>
                <Text>🔒 {recipe.name}</Text>
                <Text style={{ fontSize: 11, opacity: 0.6 }}>Открывается при выполнении квестов или в рейдах</Text>
              </Card>
            );
          }

          const resultItem = INVENTORY_ITEMS.find((i) => i.id === recipe.resultItemId);
          const resultColor = resultItem ? RARITY_COLORS[resultItem.rarity as Rarity] : '#999';

          return (
            <Card
              key={recipe.id}
              style={{
                borderLeft: `4px solid ${resultColor}`,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Div>
                  <Text style={{ fontWeight: 'bold', color: resultColor }}>
                    {resultItem?.icon} {recipe.name}
                  </Text>
                  <Text style={{ fontSize: 11, opacity: 0.6 }}>{RARITY_NAMES[resultItem?.rarity as Rarity || 'common']}</Text>
                </Div>
                <Button
                  size="s"
                  disabled={!available}
                  onClick={() => handleCraft(recipe.id)}
                >
                  Скрафтить
                </Button>
              </Div>

              {/* Cost */}
              <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, fontSize: 12 }}>
                {recipe.cost.map((cost, i) => {
                  const has = getInventoryCount(cost.itemId);
                  const costItem = INVENTORY_ITEMS.find((ci) => ci.id === cost.itemId);
                  const name = cost.itemId === 'matches' ? '🔥 спичек'
                    : cost.itemId === 'zhetons' ? '🎫 жетонов'
                    : `${costItem?.icon || ''} ${costItem?.name || cost.itemId}`;
                  return (
                    <Div
                      key={i}
                      style={{
                        color: has >= cost.count ? '#fff' : '#ef4444',
                        background: '#222',
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {name}: {has}/{cost.count}
                    </Div>
                  );
                })}
              </Div>
            </Card>
          );
        })}
      </Group>

      <Group>
        <Button mode="secondary" onClick={() => navigator.push('/inventory')}>
          📦 Открыть инвентарь
        </Button>
      </Group>
    </Panel>
  );
};
