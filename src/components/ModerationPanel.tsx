import { useState } from 'react';
import { moderationRequest } from '../services/moderation';
import styles from '../style/Moderation.module.scss';
export const ModerationPanel = () => {
  const [target, setTarget] = useState(''); const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('24'); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const run = async (action: 'ban' | 'unban') => {
    const id = Number(target);
    if (!/^[1-9]\d{0,9}$/.test(target) || !Number.isSafeInteger(id) || id > 2147483647) { setMessage('Укажите корректный числовой VK ID.'); return; }
    if (action === 'ban' && reason.trim().length < 3) { setMessage('Укажите причину (не менее 3 символов).'); return; }
    if (!window.confirm(action === 'ban' ? `Заблокировать игрока VK ID ${id}?` : `Снять блокировку с VK ID ${id}?`)) return;
    setBusy(true); setMessage('');
    try {
      await moderationRequest(`/${action}`, action === 'ban' ? { targetVkId: id, reason: reason.trim(), durationHours: duration === 'forever' ? null : Number(duration) } : { targetVkId: id });
      setMessage(action === 'ban' ? 'Игрок заблокирован.' : 'Блокировка снята.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Ошибка модерации.'); }
    finally { setBusy(false); }
  };
  return <section className={styles.panel} aria-label="Модерация игроков"><h3>УПРАВЛЕНИЕ БЛОКИРОВКАМИ</h3><p>По числовому VK ID игрока. Администратора и модератора заблокировать нельзя.</p>
    <label>VK ID<input inputMode="numeric" value={target} maxLength={10} onChange={e => setTarget(e.target.value)} placeholder="Например, 123456" /></label>
    <label>Причина<textarea value={reason} maxLength={300} onChange={e => setReason(e.target.value)} placeholder="Укажите причину блокировки" /></label>
    <label>Срок<select value={duration} onChange={e => setDuration(e.target.value)}><option value="1">1 час</option><option value="24">1 день</option><option value="168">7 дней</option><option value="720">30 дней</option><option value="forever">Бессрочно</option></select></label>
    <div className={styles.actions}><button type="button" disabled={busy} onClick={() => void run('ban')}>ЗАБЛОКИРОВАТЬ</button><button type="button" disabled={busy} onClick={() => void run('unban')}>СНЯТЬ БЛОКИРОВКУ</button></div>
    {message && <p role="status">{message}</p>}
  </section>;
};
