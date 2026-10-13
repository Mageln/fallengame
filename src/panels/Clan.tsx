import { useState } from 'react';
import { useGame } from '../game/GameContext';
import {
  CLAN_CREATE_GOLD,
  CLAN_CREATE_LEVEL,
  CLAN_JOIN_LEVEL,
  CLAN_MAX_MEMBERS,
  CLAN_WAR_CONTRIB_COST,
  CLAN_WAR_CONTRIB_SCORE,
  CLAN_WAR_MIN_CONTRIB,
  CLAN_WAR_FULL_CONTRIB,
} from '../game/constants';

const fmtDate = (key: string): string => {
  const [y, m, d] = key.split('-');
  return m && d ? `${d}.${m}.${y}` : key;
};

const bar = (pct: number, color: string) => (
  <div style={{ background: 'rgba(128,128,128,0.25)', borderRadius: 4, height: 8, marginTop: 6, overflow: 'hidden' }}>
    <div
      style={{
        background: color,
        height: '100%',
        width: `${Math.max(0, Math.min(100, pct))}%`,
        borderRadius: 4,
        transition: 'width .3s',
      }}
    />
  </div>
);

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#888', marginBottom: 2 };
const valueStyle: React.CSSProperties = { fontSize: 14, color: '#fff', fontWeight: 600 };
const sectionStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 10,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  color: '#ffd700',
  fontWeight: 700,
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

interface Props {
  onClose: () => void;
}

export const ClanModal = ({ onClose }: Props) => {
  const { state, dispatch } = useGame();
  const [name, setName] = useState('Стена');

  const clan = state.clan;
  const war = state.clanWar;
  const history = state.clanWarHistory ?? [];

  const contribPct = war ? (war.contributions / CLAN_WAR_FULL_CONTRIB) * 100 : 0;
  const scorePct = war && war.enemyScore > 0 ? (war.clanScore / war.enemyScore) * 100 : 0;
  const leading = !!war && war.clanScore >= war.enemyScore;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg,#1a1a2e 0%,#16213e 100%)',
          borderRadius: 16,
          padding: 20,
          maxWidth: 420,
          width: '94%',
          maxHeight: '88vh',
          overflowY: 'auto',
          border: '2px solid #7c3aed',
          boxShadow: '0 0 30px #7c3aed40',
          position: 'relative',
          color: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрыть */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.1)', border: '1px solid #555',
            color: '#fff', fontSize: 18, lineHeight: '30px',
            cursor: 'pointer', textAlign: 'center', padding: 0,
          }}
        >
          ×
        </button>

        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 20,
            background: 'rgba(124,58,237,0.15)', border: '1px solid #7c3aed',
            color: '#a78bfa', fontSize: 12, fontWeight: 700, marginBottom: 6,
          }}>
            КЛАН
          </div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{clan ? clan.name : 'Вступление в клан'}</h2>
        </div>

        {/* Информация о клане / вступление */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Клан</div>
          {clan ? (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div><div style={labelStyle}>Участников</div><div style={valueStyle}>{clan.members}/{CLAN_MAX_MEMBERS}</div></div>
              <div><div style={labelStyle}>Очки</div><div style={valueStyle}>{clan.score}</div></div>
              <div><div style={labelStyle}>Рейтинг</div><div style={valueStyle}>{state.clanRating}</div></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#888' }}>
                Вход с {CLAN_JOIN_LEVEL} ур., создание с {CLAN_CREATE_LEVEL} за {CLAN_CREATE_GOLD} золота.
              </div>
              <button
                onClick={() => dispatch({ type: 'JOIN_CLAN' })}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  background: 'linear-gradient(180deg,#7c3aed,#5b21b6)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  border: 'none', cursor: 'pointer',
                }}
              >
                Вступить
              </button>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название клана"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid #444',
                  color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
              <button
                onClick={() => dispatch({ type: 'CREATE_CLAN', name })}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid #555',
                  color: '#fff', fontSize: 13, cursor: 'pointer',
                }}
              >
                Создать за {CLAN_CREATE_GOLD} золота
              </button>
            </div>
          )}
        </div>

        {/* Война кланов */}
        {clan && (
          <div style={sectionStyle}>
            <div style={sectionTitle}>Война кланов</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
              <div><div style={labelStyle}>Побед</div><div style={valueStyle}>{clan.warWins}</div></div>
              <div><div style={labelStyle}>Поражений</div><div style={valueStyle}>{clan.warLosses}</div></div>
              {clan.warStreak > 1 && (
                <div><div style={labelStyle}>Серия</div><div style={valueStyle}>{clan.warStreak}</div></div>
              )}
            </div>

            {!war ? (
              <div style={{ fontSize: 13, color: '#888' }}>Противник ещё не назначен — загляните позже.</div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {leading ? '🏆' : '⚔️'} {war.enemyName}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                  Рейтинг: {war.enemyRating} · Очки врага: {war.enemyScore}
                </div>

                <div style={{ fontSize: 12, color: '#888' }}>Очки клана: {war.clanScore}</div>
                {bar(scorePct, leading ? '#22c55e' : '#ef4444')}

                <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                  Ваш вклад: {war.contributions}/{CLAN_WAR_FULL_CONTRIB} (+{CLAN_WAR_CONTRIB_SCORE} очка)
                </div>
                {bar(contribPct, '#3b82f6')}

                {!war.claimed ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      disabled={state.zhetons < CLAN_WAR_CONTRIB_COST || war.contributions >= CLAN_WAR_FULL_CONTRIB}
                      onClick={() => dispatch({ type: 'CLAN_WAR_CONTRIBUTE' })}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8,
                        background: 'linear-gradient(180deg,#3b82f6,#2563eb)',
                        color: '#fff', fontWeight: 700, fontSize: 13,
                        border: 'none', cursor: 'pointer',
                        opacity: state.zhetons < CLAN_WAR_CONTRIB_COST || war.contributions >= CLAN_WAR_FULL_CONTRIB ? 0.5 : 1,
                      }}
                    >
                      {war.contributions >= CLAN_WAR_FULL_CONTRIB ? 'Вклад полон' : `Взнос (${CLAN_WAR_CONTRIB_COST} жетон)`}
                    </button>
                    <button
                      disabled={war.contributions < CLAN_WAR_MIN_CONTRIB}
                      onClick={() => dispatch({ type: 'CLAN_WAR_CLAIM' })}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8,
                        background: 'linear-gradient(180deg,#f59e0b,#d97706)',
                        color: '#000', fontWeight: 700, fontSize: 13,
                        border: 'none', cursor: 'pointer',
                        opacity: war.contributions < CLAN_WAR_MIN_CONTRIB ? 0.5 : 1,
                      }}
                    >
                      {war.contributions < CLAN_WAR_MIN_CONTRIB ? `С ${CLAN_WAR_MIN_CONTRIB} взн.` : '🏆 Награда'}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, color: '#22c55e', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                    ✅ Награда получена
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* История войн */}
        {history.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitle}>История</div>
            {history.map((h) => (
              <div key={`${h.dateKey}-${h.enemyName}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>{h.win ? '🏆' : '💀'} {fmtDate(h.dateKey)} · {h.enemyName}</span>
                <span style={{ color: h.win ? '#22c55e' : '#ef4444' }}>
                  {h.clanScore}:{h.enemyScore} +{h.gold}з
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
