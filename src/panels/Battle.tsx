import { useState, useEffect } from 'react';
import { Panel, PanelHeader, Group, Button, Text, Header, Div, Cell } from '@vkontakte/vkui';
import { Icon28ArrowLeftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useGame } from '../game/GameContext';

interface Props {
  id: string;
}

export const Battle = ({ id }: Props) => {
  const navigator = useRouteNavigator();
  const { state, dispatch, derived } = useGame();
  const battle = state.battle;
  const [bossShake, setBossShake] = useState(false);
  const [lastDamage, setLastDamage] = useState<{ value: number; crit: boolean } | null>(null);
  const prevBossHpRef = { current: battle?.bossHp ?? 0 };

  // Sound effect helper
  const playSound = (type: 'hit' | 'crit' | 'heal' | 'grenade' | 'victory' | 'defeat') => {
    if (!state.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      switch (type) {
        case 'hit':
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.15);
          break;
        case 'crit':
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.25);
          break;
        case 'heal':
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
          break;
        case 'grenade':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
          break;
        case 'victory':
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.setValueAtTime(500, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
          osc.frequency.setValueAtTime(800, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
          break;
        case 'defeat':
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.6);
          break;
      }
    } catch {
      // Audio not supported
    }
  };

  // Track boss HP changes for shake animation
  useEffect(() => {
    if (battle && battle.bossHp < (prevBossHpRef.current ?? 0)) {
      setBossShake(true);
      setLastDamage({ value: prevBossHpRef.current - battle.bossHp, crit: false });
      setTimeout(() => setBossShake(false), 150);
      setTimeout(() => setLastDamage(null), 1000);
    }
    prevBossHpRef.current = battle?.bossHp ?? 0;
  }, [battle?.bossHp]);

  const packs: Array<1 | 3 | 10 | 30> = [1, 3, 10, 30];

  if (!battle) {
    return (
      <Panel id={id}>
        <PanelHeader before={<Button mode="tertiary" onClick={() => navigator.back()}><Icon28ArrowLeftOutline /></Button>}>
          Бой
        </PanelHeader>
        <Group>
          <Div><Text>Бой не начат. Выберите босса на карте района.</Text></Div>
        </Group>
      </Panel>
    );
  }

  const bossHpPercent = (battle.bossHp / battle.bossMaxHp) * 100;
  const playerHpPercent = (battle.playerHp / battle.playerMaxHp) * 100;
  const playerWon = battle.bossHp <= 0;
  const playerDead = battle.playerHp <= 0;

  return (
    <Panel id={id}>
      <PanelHeader before={<Button mode="tertiary" onClick={() => { dispatch({ type: 'LEAVE_BATTLE' }); navigator.back(); }}><Icon28ArrowLeftOutline /></Button>}>
        {battle.bossName}
      </PanelHeader>

      {/* Boss display with animations */}
      <Group>
        <Div
          style={{
            textAlign: 'center',
            padding: 20,
            transform: bossShake ? 'translateX(8px)' : 'none',
            transition: 'transform 0.1s ease',
            position: 'relative',
          }}
        >
          {/* Boss HP bar */}
          <Div style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{battle.bossName}</Text>
            <Div style={{ 
              background: '#333', 
              borderRadius: 8, 
              height: 16, 
              overflow: 'hidden',
              position: 'relative',
              marginTop: 4,
            }}>
              <Div style={{
                background: bossHpPercent > 50 ? '#ef4444' : bossHpPercent > 25 ? '#f59e0b' : '#dc2626',
                height: '100%',
                width: `${Math.max(0, bossHpPercent)}%`,
                borderRadius: 8,
                transition: 'width 0.3s ease',
              }} />
              <Text style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 'bold',
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}>
                {Math.max(0, battle.bossHp)} / {battle.bossMaxHp}
              </Text>
            </Div>
          </Div>

          {/* Damage number popup */}
          {lastDamage && !playerWon && !playerDead && (
            <Div style={{
              position: 'absolute',
              top: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 24,
              fontWeight: 'bold',
              color: '#fbbf24',
              textShadow: '0 0 10px #fbbf24',
              animation: 'floatUp 1s ease-out forwards',
              pointerEvents: 'none',
            }}>
              💥 {lastDamage.value}
            </Div>
          )}

          {/* Player HP bar */}
          <Div style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 14 }}>
              Вы {Math.max(0, battle.playerHp)} / {battle.playerMaxHp}
            </Text>
            <Div style={{ 
              background: '#333', 
              borderRadius: 8, 
              height: 14, 
              overflow: 'hidden',
              marginTop: 4,
            }}>
              <Div style={{
                background: playerHpPercent > 50 ? '#22c55e' : playerHpPercent > 25 ? '#eab308' : '#ef4444',
                height: '100%',
                width: `${Math.max(0, playerHpPercent)}%`,
                borderRadius: 8,
                transition: 'width 0.3s ease',
              }} />
            </Div>
            <Text style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
              Урон: {derived.damage} | Выносливость: {derived.stamina}
            </Text>
          </Div>
        </Div>
      </Group>

      {/* Battle result */}
      {(playerWon || playerDead) && (
        <Group>
          <Div style={{ 
            textAlign: 'center', 
            padding: 20,
            background: playerWon ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
              {playerWon ? '🏆 Победа!' : '💀 Вы погибли!'}
            </Text>
            {playerWon ? <span style={{display:'none'}}>{playSound('victory')}</span> : null}
            {playerDead ? <span style={{display:'none'}}>{playSound('defeat')}</span> : null}
            <Button style={{ marginTop: 12 }} onClick={() => { dispatch({ type: 'LEAVE_BATTLE' }); navigator.back(); }}>
              Продолжить
            </Button>
          </Div>
        </Group>
      )}

      {/* Actions - disabled when battle ends */}
      {!playerWon && !playerDead && (
        <Group>
          <Div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => { dispatch({ type: 'BATTLE_ATTACK', technique: false }); playSound('hit'); }}>
              ⚔️ Удар
            </Button>
            <Button mode="secondary" onClick={() => { dispatch({ type: 'BATTLE_ATTACK', technique: true }); playSound('hit'); }}>
              🔥 Приём (+35%)
            </Button>
            <Button mode="secondary" disabled={state.medkits <= 0} onClick={() => { dispatch({ type: 'BATTLE_HEAL' }); playSound('heal'); }}>
              💊 Аптечка ({state.medkits})
            </Button>
          </Div>
          
          <Div style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>Гранаты: {state.grenades}</Text>
            <Div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {packs.map((count) => (
                <Button 
                  key={count} 
                  size="s" 
                  mode="tertiary"
                  disabled={state.grenades < count}
                  onClick={() => { dispatch({ type: 'BATTLE_GRENADES', count }); playSound('grenade'); }}
                >
                  💣 x{count} ({count * 12} ур.)
                </Button>
              ))}
            </Div>
          </Div>
        </Group>
      )}

      {/* Friends */}
      <Group header={<Header>Союзники ({battle.friends.length}/4)</Header>}>
        <Cell>Вы</Cell>
        {battle.friends.map((name) => (
          <Cell key={name}>{name}</Cell>
        ))}
        <Div>
          <Button stretched onClick={() => dispatch({ type: 'INVITE_FRIEND' })}>
            🤝 Позвать друга
          </Button>
        </Div>
      </Group>

      {/* Battle log */}
      <Group header={<Header>Лог боя</Header>}>
        <Div style={{ 
          maxHeight: 200, 
          overflowY: 'auto', 
          background: '#111', 
          borderRadius: 8, 
          padding: 10,
          fontSize: 12,
        }}>
          {battle.log.slice(-10).map((line, i) => (
            <Text key={`${line}-${i}`} style={{ 
              marginBottom: 2, 
              color: line.includes('крит') ? '#fbbf24' : line.includes('сломалось') ? '#ef4444' : '#ccc'
            }}>
              {line}
            </Text>
          ))}
        </Div>
      </Group>

      {/* Sound toggle */}
      <Group>
        <Button 
          mode="tertiary" 
          onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
        >
          {state.soundEnabled ? '🔊 Звук включён' : '🔇 Звук выключен'}
        </Button>
      </Group>

      {/* CSS Animation */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
        }
      `}</style>
    </Panel>
  );
};

