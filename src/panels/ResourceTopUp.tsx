import { useEffect, useRef } from 'react';
import { ResourceIcon } from '../components/ResourceIcon';
import { useGame } from '../game/GameContext';
import { isVkEnvironment } from '../config/vkConfig';
import { makeTestTopUp, TOP_UP_DETAILS, TOP_UP_PACKS } from '../game/resourceTopUp';
import type { TopUpResource } from '../game/resourceTopUp';
import styles from '../style/Room.module.scss';

interface Props { resource: TopUpResource; onClose: () => void }
export const ResourceTopUp = ({ resource, onClose }: Props) => {
  const { state, dispatch, serverMode } = useGame();
  const panelRef = useRef<HTMLElement>(null);
  const details = TOP_UP_DETAILS[resource];
  const testMode = import.meta.env.DEV && !serverMode && !isVkEnvironment();
  const unavailable = !testMode || resource === 'premium';
  const balance = resource === 'premium' ? state.premiumGold : state[resource];
  const full = resource === 'energy' && state.energy >= state.maxEnergy;

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const buttons = Array.from(panelRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if (!buttons.length) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === panelRef.current)) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); before?.focus(); };
  }, [onClose]);

  return <div className={styles.backdrop}>
    <div className={styles.overlay} onClick={onClose}>
      <section ref={panelRef} tabIndex={-1} className={styles.paper} role="dialog" aria-modal="true" aria-labelledby="resource-topup-title" onClick={event => event.stopPropagation()}>
        <span className={styles.tape} aria-hidden="true" />
        <p className={styles.paperEyebrow}>ЯЩИК С ПРИПАСАМИ · ТОРГОВАЯ ТОЧКА</p>
        <h3 id="resource-topup-title"><ResourceIcon name={details.icon} /> {details.title}</h3>
        <p>На балансе: <ResourceIcon name={details.icon} /> {new Intl.NumberFormat('ru-RU').format(balance)}{resource === 'energy' ? ` / ${state.maxEnergy}` : ''}</p>
        {unavailable
          ? <p role="status">Пополнение этого ресурса пока недоступно. Показаны примеры пакетов: оплата ещё не подключена, списания и начисления не будет.</p>
          : <p>Тестовый режим: выбери бесплатный пакет. Реальная покупка и списание денег не выполняются.</p>}
        {full && !unavailable && <p role="status">Энергия уже заполнена.</p>}
        <div className={styles.packList}>
          {TOP_UP_PACKS.map((amount, index) => {
            const actual = !unavailable && resource === 'energy' ? Math.max(0, Math.min(amount, state.maxEnergy - state.energy)) : amount;
            return <button key={amount} type="button" className={styles.packCard} disabled={unavailable || full} onClick={() => {
              const action = makeTestTopUp(resource, amount, testMode, state);
              if (action) { dispatch(action); onClose(); }
            }}>
              <span>Пакет «{['малый', 'средний', 'большой'][index]}»</span>
              <strong><ResourceIcon name={details.icon} /> +{actual}</strong>
              <span className={styles.packPrice}>{unavailable ? 'НЕДОСТУПНО' : 'БЕСПЛАТНО · ТЕСТ'}</span>
            </button>;
          })}
        </div>
        {resource === 'energy' && !unavailable && !full && <p>Энергия восстанавливается только до максимального запаса.</p>}
        <div className={styles.actions}><button type="button" className={styles.plainButton} onClick={onClose}>ЗАКРЫТЬ</button></div>
      </section>
    </div>
  </div>;
};
