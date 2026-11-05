import { useEffect } from 'react';
import { useGame } from '../game/GameContext';
import { LOGIN_REWARDS, loginRewardStatus } from '../game/loginRewards';
import styles from '../style/LoginReward.module.scss';

export const LoginReward = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useGame();
  const status = loginRewardStatus(state.loginRewards);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <section className={styles.panel} role="dialog" aria-labelledby="login-reward-title">
    <header className={styles.header}><span className={styles.lamp} aria-hidden="true" /><div><small>РАЦИЯ · ПОСЫЛКА ВЫЖИВШЕМУ</small><h2 id="login-reward-title">НАГРАДА ЗА ВХОД</h2></div><button type="button" aria-label="Закрыть награду за вход" onClick={onClose}>✕</button></header>
    <p className={styles.intro}>{status.reset ? 'С возвращением! После перерыва серия начинается с первого дня.' : 'Заходите и забирайте награду каждый день. Пропустите день — серия начнётся заново.'}</p>
    <div className={styles.days}>{LOGIN_REWARDS.map((reward, index) => {
      const day = index + 1;
      const current = day === status.day;
      const claimed = status.available ? day < status.day : day <= status.day;
      return <article key={day} className={`${styles.day} ${current ? styles.current : ''} ${claimed ? styles.claimed : ''}`}>
        <small>ДЕНЬ {day}</small><strong>{claimed ? '✓' : day === 7 ? '🎁' : '📦'}</strong>
        <span>🔫 {reward.bullets}</span>{reward.gold > 0 && <span>💰 {reward.gold}</span>}{reward.matches > 0 && <span>🔥 {reward.matches}</span>}{reward.medkits > 0 && <span>💊 {reward.medkits}</span>}
        {current && <em>{status.available ? 'СЕГОДНЯ' : 'ПОЛУЧЕНО'}</em>}
      </article>;
    })}</div>
    <div className={styles.actions}><p>{status.available ? `День ${status.day} из 7 · после седьмого дня начнётся новая серия` : 'Сегодняшняя награда получена. Следующая — завтра.'}</p><button type="button" disabled={!status.available} onClick={() => { dispatch({ type: 'CLAIM_LOGIN_REWARD' }); onClose(); }}>{status.available ? 'ЗАБРАТЬ НАГРАДУ' : 'ПОЛУЧЕНО ✓'}</button></div>
    <small className={styles.hint}>Обновление в полночь по времени устройства. 💰 — игровые припасы.</small>
  </section>;
};
