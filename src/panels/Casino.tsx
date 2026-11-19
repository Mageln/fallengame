import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../game/GameContext';
import { CASINO_BET, CASINO_PRIZES, normalizeCasino } from '../game/casino';
import { todayUtc } from '../game/survival';
import type { GameAction } from '../game/types';
import styles from '../style/Casino.module.scss';

type Tab = 'slots' | 'cards' | 'safe' | 'prizes';

const SYMBOL_ART: Record<string, string> = {
  '🥤': '/casino/symbol-cap.webp',
  '🔫': '/casino/symbol-pistol.webp',
  '🧟': '/casino/symbol-zombie.webp',
  '📻': '/casino/symbol-radio.webp',
};
const IDLE_REELS = ['🥤', '🔫', '📻'];
const SAFE_ART = ['/casino/safe-1.webp', '/casino/safe-2.webp', '/casino/safe-3.webp'];
const CARD_FACES = { loss: '/casino/card-face-loss.webp', back: '/casino/card-back.webp', win: '/casino/card-face-win.webp', refund: '/casino/card-face-return.webp' };
const BADGE_ART: Record<string, string> = { radio: '/casino/badge-radio.webp', crown: '/casino/badge-crown.webp' };

// Лента барабана: два одинаковых полукольца подряд — прокрутка без стыка.
const STRIP = ['🥤', '🔫', '🧟', '📻', '🔫', '🧟', '📻', '🥤', '🧟', '🔫', '📻', '🧟'];
const STRIP_ART = [...STRIP, ...STRIP].map(symbol => SYMBOL_ART[symbol]);
const STOP_MS = [640, 980, 1320];
const SETTLE_MS = 260;
const spinDuration = (index: number) => 0.62 + index * 0.08;

export const CasinoModal = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useGame();
  const casino = normalizeCasino(state.casino);
  const [tab, setTab] = useState<Tab>('safe');
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [stopped, setStopped] = useState(2);
  const [landedAt, setLandedAt] = useState(-1);
  const [dealtCard, setDealtCard] = useState<number | null>(null);
  const timeout = useRef<number | undefined>();
  const spinTimers = useRef<number[]>([]);
  const panel = useRef<HTMLElement>(null);
  const clearSpinTimers = () => {
    spinTimers.current.forEach(id => window.clearTimeout(id));
    spinTimers.current = [];
  };
  useEffect(() => {
    // Пока крутятся барабаны, результат уже пришёл от редьюсера — даём анимации доиграть.
    if (spinning) return;
    setBusy(false);
    window.clearTimeout(timeout.current);
  }, [state.casino, spinning]);
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
    return () => {
      window.removeEventListener('keydown', key);
      window.clearTimeout(timeout.current);
      clearSpinTimers();
    };
  }, [onClose]);
  const act = (action: GameAction) => {
    if (busy) return;
    setBusy(true);
    dispatch(action);
    timeout.current = window.setTimeout(() => setBusy(false), 8000);
  };
  const spin = () => {
    if (busy || spinning) return;
    clearSpinTimers();
    setSpinning(true);
    setStopped(-1);
    setLandedAt(-1);
    setBusy(true);
    dispatch({ type: 'CASINO_SLOTS' });
    timeout.current = window.setTimeout(() => setBusy(false), 8000);
    STOP_MS.forEach((at, index) => {
      spinTimers.current.push(window.setTimeout(() => { setStopped(index); setLandedAt(index); }, at));
    });
    spinTimers.current.push(window.setTimeout(() => {
      setSpinning(false);
      setBusy(false);
    }, STOP_MS[STOP_MS.length - 1] + SETTLE_MS));
  };
  const pickCard = (choice: number) => {
    setDealtCard(choice);
    act({ type: 'CASINO_CARD', choice });
  };
  const dealFace = /выигрыш/i.test(casino.result) ? CARD_FACES.win
    : /возврат/i.test(casino.result) ? CARD_FACES.refund
      : /пусто/i.test(casino.result) ? CARD_FACES.loss : null;
  const showDealt = dealtCard !== null && !busy && !!dealFace;
  const safeAvailable = !casino.lastSafeDate || casino.lastSafeDate < todayUtc();
  const reels = casino.reels.length === 3 ? casino.reels : IDLE_REELS;
  const spinningNow = spinning;
  const resultLabel = spinningNow ? 'Барабаны крутятся…' : busy ? 'Ждём результат…' : casino.result || 'Выбери сейф и получи первые фишки.';
  return <div className={styles.backdrop} onClick={onClose}>
    <section ref={panel} tabIndex={-1} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="casino-title" onClick={event => event.stopPropagation()}>
      <div className={styles.room} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.sign}>
          <small>ПОДПОЛЬНЫЙ КЛУБ · ЭРГЕЙТ · СТОЛ №3</small>
          <h2 id="casino-title">РЖАВЫЙ ДЖЕКПОТ</h2>
          <p>Счастье любит смелых. А сейф — терпеливых.</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть казино">✕</button>
      </header>
      <div className={styles.wallet}>
        <span><img src="/casino/symbol-cap.webp" alt="" /> Фишки: <b>{casino.chips}</b></span>
        <span className={styles.points}>★ Очки клуба: <b>{casino.points}</b></span>
      </div>
      <p className={styles.disclaimer}>Только бесплатные игровые фишки. Реальные деньги, премиум-валюта и вывод наград не используются.</p>
      <nav className={styles.tabs} aria-label="Разделы казино">
        {([['safe', 'СЕЙФ'], ['slots', 'АВТОМАТ'], ['cards', 'КАРТЫ'], ['prizes', 'ПРИЗЫ']] as const).map(([id, title]) =>
          <button type="button" key={id} className={tab === id ? styles.active : ''} aria-pressed={tab === id} onClick={() => setTab(id)}>{title}</button>)}
      </nav>
      <p className={styles.result} role="status" aria-live="polite">{resultLabel}</p>
      {tab === 'safe' && <div className={styles.content}>
        <h3>Бесплатный сейф</h3>
        <p>Один сейф в день: 10 фишек и случайно 10 патронов, 5 спичек или 10 припасов. Каждый ресурс выпадает с вероятностью 1/3. Обновление в 00:00 UTC.</p>
        <div className={styles.safes}>
          {[0, 1, 2].map(choice => <button type="button" key={choice} className={styles.safe} disabled={busy || !safeAvailable} onClick={() => act({ type: 'CASINO_SAFE', choice })}>
            <img src={SAFE_ART[choice]} alt="" />
            <span>СЕЙФ {choice + 1}</span>
          </button>)}
        </div>
        <p>{safeAvailable ? 'Выбери один сейф бесплатно. Взлом занимает мгновение.' : 'Сегодняшний сейф уже открыт. Возвращайся после полуночи по UTC.'}</p>
      </div>}
      {tab === 'slots' && <div className={styles.content}>
        <h3>Три крышки</h3>
        <p>Ставка — {CASINO_BET} фишек. Каждое вращение также даёт 1 очко клуба.</p>
        <div className={`${styles.machine} ${spinningNow ? styles.machineOn : ''}`}>
          <div className={styles.reels} aria-label={spinningNow ? 'Барабаны крутятся' : `Барабаны: ${casino.reels.join(' ') || 'ещё не вращались'}`}>
            {reels.map((symbol, i) => {
              const rolling = spinningNow && i > stopped;
              const landed = landedAt === i;
              return <span key={i} className={`${styles.reel} ${rolling ? styles.rolling : ''} ${landed ? styles.landed : ''}`} style={rolling ? { '--roll': `${spinDuration(i)}s` } as CSSProperties : undefined}>
                {rolling
                  ? <span className={styles.strip} aria-hidden="true">{STRIP_ART.map((src, k) => <img key={k} src={src} alt="" />)}</span>
                  : <img className={styles.symbol} src={SYMBOL_ART[symbol] || SYMBOL_ART[IDLE_REELS[i]]} alt="" />}
              </span>;
            })}
          </div>
          <button type="button" className={`${styles.lever} ${spinningNow ? styles.pulled : ''}`} aria-label={`Крутить барабаны за ${CASINO_BET} фишек`} disabled={busy || casino.chips < CASINO_BET} onClick={spin}>
            <span>КРУТИТЬ · {CASINO_BET}</span>
          </button>
        </div>
        <table className={styles.paytable} aria-label="Таблица выплат">
          <tbody>
            <tr><td><img src="/casino/symbol-radio.webp" alt="" /><img src="/casino/symbol-radio.webp" alt="" /><img src="/casino/symbol-radio.webp" alt="" /></td><th>30 фишек · 1/64</th></tr>
            <tr><td><img src="/casino/symbol-zombie.webp" alt="" /><img src="/casino/symbol-zombie.webp" alt="" /><img src="/casino/symbol-zombie.webp" alt="" /></td><th>20 фишек · 3/64</th></tr>
            <tr><td><img src="/casino/symbol-cap.webp" alt="" /><img src="/casino/symbol-pistol.webp" alt="" /><img src="/casino/symbol-zombie.webp" alt="" /></td><th>3 фишки за пару · 36/64</th></tr>
            <tr><td className={styles.none}>нет пары</td><th>0 фишек · 24/64</th></tr>
          </tbody>
        </table>
      </div>}
      {tab === 'cards' && <div className={styles.content}>
        <h3>Карты выжившего</h3>
        <p>Выбери карту за {CASINO_BET} фишек. Среди трёх исходов: 0 фишек, возврат 5 или выигрыш 10; каждый шанс — 1/3. За игру также даётся 1 очко клуба.</p>
        <div className={styles.cards}>
          {[0, 1, 2].map(choice => {
            const flipped = showDealt && dealtCard === choice;
            return <button type="button" key={choice} className={styles.card} disabled={busy || casino.chips < CASINO_BET} onClick={() => pickCard(choice)}>
              <span className={flipped ? styles.flipped : ''}>
                <img className={styles.cardBack} src={CARD_FACES.back} alt="" />
                <img className={styles.cardFace} src={dealFace || CARD_FACES.loss} alt="" />
              </span>
              <b>КАРТА {choice + 1}</b>
            </button>;
          })}
        </div>
        {showDealt && dealFace && <p className={styles.reveal}>Открыта карта {dealtCard + 1}: {dealFace === CARD_FACES.win ? 'выигрыш 10 фишек' : dealFace === CARD_FACES.refund ? 'возврат ставки' : 'пусто'}.</p>}
      </div>}
      {tab === 'prizes' && <div className={styles.content}>
        <h3>Коллекция клуба</h3>
        <p>Очки клуба получаются за игры. Значки отображаются в профиле и не влияют на характеристики.</p>
        <div className={styles.prizes}>{CASINO_PRIZES.map(prize => {
          const owned = casino.owned.includes(prize.id);
          const equipped = casino.equipped === prize.id;
          return <article key={prize.id}>
            <img src={BADGE_ART[prize.id]} alt="" />
            <div><b>{prize.name}</b><p>{owned ? 'Получен' : `${prize.cost} очков клуба`}</p></div>
            <button type="button" disabled={busy || (!owned && casino.points < prize.cost)} onClick={() => act({ type: 'CASINO_PRIZE', prizeId: prize.id })}>{equipped ? 'СНЯТЬ' : owned ? 'НАДЕТЬ' : 'ПОЛУЧИТЬ'}</button>
          </article>;
        })}</div>
      </div>}
    </section>
  </div>;
};
