import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/GameContext';
import { CASINO_BET, CASINO_PRIZES, normalizeCasino } from '../game/casino';
import { todayUtc } from '../game/survival';
import type { GameAction } from '../game/types';
import styles from '../style/Casino.module.scss';

type Tab = 'slots' | 'cards' | 'safe' | 'prizes';
export const CasinoModal = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useGame();
  const casino = normalizeCasino(state.casino);
  const [tab, setTab] = useState<Tab>('safe');
  const [busy, setBusy] = useState(false);
  const timeout = useRef<number | undefined>();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { setBusy(false); window.clearTimeout(timeout.current); }, [state.casino]);
  useEffect(() => {
    panel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !panel.current) return;
      const buttons = Array.from(panel.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if (!buttons.length) return;
      if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === panel.current)) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); window.clearTimeout(timeout.current); };
  }, [onClose]);
  const act = (action: GameAction) => {
    if (busy) return;
    setBusy(true);
    dispatch(action);
    timeout.current = window.setTimeout(() => setBusy(false), 8000);
  };
  const safeAvailable = !casino.lastSafeDate || casino.lastSafeDate < todayUtc();
  return <div className={styles.backdrop} onClick={onClose}>
    <section ref={panel} tabIndex={-1} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="casino-title" onClick={event => event.stopPropagation()}>
      <header className={styles.header}><div><small>ПОДПОЛЬНЫЙ КЛУБ · ЭРГЕЙТ</small><h2 id="casino-title">🎰 РЖАВЫЙ ДЖЕКПОТ</h2><p>Счастье любит смелых. А сейф — терпеливых.</p></div><button type="button" onClick={onClose} aria-label="Закрыть казино">✕</button></header>
      <div className={styles.wallet}><span>🎟 Фишки: <b>{casino.chips}</b></span><span>★ Очки клуба: <b>{casino.points}</b></span></div>
      <p className={styles.disclaimer}>Только бесплатные игровые фишки. Реальные деньги, премиум-валюта и вывод наград не используются.</p>
      <nav className={styles.tabs} aria-label="Разделы казино">{([['safe', '🔐 СЕЙФ'], ['slots', '🎰 АВТОМАТ'], ['cards', '🃏 КАРТЫ'], ['prizes', '🏆 ПРИЗЫ']] as const).map(([id, title]) => <button type="button" key={id} className={tab === id ? styles.active : ''} aria-pressed={tab === id} onClick={() => setTab(id)}>{title}</button>)}</nav>
      <p className={styles.result} role="status" aria-live="polite">{busy ? 'Ждём результат…' : casino.result || 'Выбери сейф и получи первые фишки.'}</p>
      {tab === 'safe' && <div className={styles.content}><h3>Бесплатный сейф</h3><p>Один сейф в день: 10 фишек и случайно 10 патронов, 5 спичек или 10 припасов. Каждый ресурс выпадает с вероятностью 1/3. Обновление в 00:00 UTC.</p><div className={styles.choices}>{[0, 1, 2].map(choice => <button type="button" key={choice} disabled={busy || !safeAvailable} onClick={() => act({ type: 'CASINO_SAFE', choice })}><strong>🔐</strong>СЕЙФ {choice + 1}</button>)}</div><p>{safeAvailable ? 'Выбери один сейф бесплатно.' : 'Сегодняшний сейф уже открыт.'}</p></div>}
      {tab === 'slots' && <div className={styles.content}><h3>Три крышки</h3><p>Ставка — {CASINO_BET} фишек. Каждое вращение также даёт 1 очко клуба.</p><div className={styles.reels} aria-label={`Барабаны: ${casino.reels.join(' ') || 'ещё не вращались'}`}>{(casino.reels.length === 3 ? casino.reels : ['🥤', '🔫', '📻']).map((symbol, i) => <span key={i}>{symbol}</span>)}</div><p>Пара: 3 фишки (36/64); три одинаковых: 20 (3/64); три рации: 30 (1/64); без пары: 0 (24/64). Символы равновероятны.</p><button type="button" className={styles.primary} disabled={busy || casino.chips < CASINO_BET} onClick={() => act({ type: 'CASINO_SLOTS' })}>КРУТИТЬ · {CASINO_BET} ФИШЕК</button></div>}
      {tab === 'cards' && <div className={styles.content}><h3>Карты выжившего</h3><p>Выбери карту за {CASINO_BET} фишек. Среди трёх исходов: 0 фишек, возврат 5 или выигрыш 10; каждый шанс — 1/3. За игру также даётся 1 очко клуба.</p><div className={styles.choices}>{[0, 1, 2].map(choice => <button type="button" key={choice} disabled={busy || casino.chips < CASINO_BET} onClick={() => act({ type: 'CASINO_CARD', choice })}><strong>🂠</strong>КАРТА {choice + 1}</button>)}</div></div>}
      {tab === 'prizes' && <div className={styles.content}><h3>Коллекция клуба</h3><p>Очки клуба получаются за игры. Значки отображаются в профиле и не влияют на характеристики.</p><div className={styles.prizes}>{CASINO_PRIZES.map(prize => { const owned = casino.owned.includes(prize.id); const equipped = casino.equipped === prize.id; return <article key={prize.id}><span>{prize.icon}</span><div><b>{prize.name}</b><p>{owned ? 'Получен' : `${prize.cost} очков клуба`}</p></div><button type="button" disabled={busy || (!owned && casino.points < prize.cost)} onClick={() => act({ type: 'CASINO_PRIZE', prizeId: prize.id })}>{equipped ? 'СНЯТЬ' : owned ? 'НАДЕТЬ' : 'ПОЛУЧИТЬ'}</button></article>; })}</div></div>}
    </section>
  </div>;
};
