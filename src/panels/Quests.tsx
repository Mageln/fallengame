import { Panel, PanelHeader, Group, Button, Text, Header, Div, Card } from '@vkontakte/vkui';
import { Icon28ArrowLeftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useGame } from '../game/GameContext';
import { DAILY_QUESTS } from '../game/constants';
import { DailyQuestProgress } from '../game/types';

interface Props {
  id: string;
}

export const Quests = ({ id }: Props) => {
  const navigator = useRouteNavigator();
  const { state, dispatch } = useGame();

  const handleClaim = (questId: string) => {
    dispatch({ type: 'CLAIM_QUEST_REWARD', questId });
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigator.back()}><Icon28ArrowLeftOutline /></Button>}>
        Ежедневные квесты
      </PanelHeader>

      <Group>
        <Div>
          <Text>Выполняйте задания каждый день за бонусы!</Text>
          <Text style={{ fontSize: 12, opacity: 0.6 }}>
            Квесты сбрасываются каждый день. Следите за прогрессом.
          </Text>
        </Div>
      </Group>

      <Group header={<Header>Задания на сегодня</Header>}>
        {DAILY_QUESTS.map((quest) => {
          const progress = state.daily.quests.find((qp: DailyQuestProgress) => qp.questId === quest.id);
          if (!progress) return null;
          const isCompleted = progress.completed && !progress.claimed;
          const isClaimed = progress.claimed;
          const percent = Math.min(100, (progress.progress / quest.target) * 100);

          return (
            <Card
              key={quest.id}
              style={{
                borderLeft: isClaimed ? '4px solid #10b981' : isCompleted ? '4px solid #f59e0b' : '4px solid #6b7280',
                padding: 12,
                marginBottom: 8,
                opacity: isClaimed ? 0.6 : 1,
              }}
            >
              <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Div>
                  <Text style={{ fontWeight: 'bold' }}>{quest.name}</Text>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>{quest.description}</Text>
                </Div>
                <Text style={{ fontWeight: 'bold', fontSize: 14 }}>
                  {progress.progress}/{quest.target}
                </Text>
              </Div>

              {/* Progress bar */}
              <Div style={{ background: '#333', borderRadius: 4, height: 6, marginTop: 8, overflow: 'hidden' }}>
                <Div
                  style={{
                    background: isClaimed ? '#10b981' : isCompleted ? '#f59e0b' : '#3b82f6',
                    height: '100%',
                    width: `${percent}%`,
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Div>

              {/* Rewards */}
              <Div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                {quest.rewardBullets > 0 && <Text>🔫+{quest.rewardBullets}</Text>}
                {quest.rewardMatches > 0 && <Text>🔥+{quest.rewardMatches}</Text>}
                {quest.rewardGrenades > 0 && <Text>💣+{quest.rewardGrenades}</Text>}
                {quest.rewardGold > 0 && <Text>🪙+{quest.rewardGold}</Text>}
              </Div>

              {/* Claim button */}
              {isCompleted && !isClaimed && (
                <Button size="m" style={{ marginTop: 8, width: '100%' }} onClick={() => handleClaim(quest.id)}>
                  🎁 Забрать награду
                </Button>
              )}
              {isClaimed && (
                <Text style={{ marginTop: 8, textAlign: 'center', color: '#10b981' }}>✅ Получено</Text>
              )}
            </Card>
          );
        })}
      </Group>

      <Group>
        <Div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <Text>Готово: {state.daily.quests.filter((q: DailyQuestProgress) => q.completed && !q.claimed).length}</Text>
          <Text>Получено: {state.daily.quests.filter((q: DailyQuestProgress) => q.claimed).length}</Text>
        </Div>
      </Group>
    </Panel>
  );
};
