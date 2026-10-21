import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../game/GameContext';
import { CLAN_CREATE_GOLD, CLAN_MAX_MEMBERS, CLAN_WAR_CONTRIB_COST, CLAN_WAR_FULL_CONTRIB, CLAN_WAR_MIN_CONTRIB } from '../game/constants';
import { CLAN_CONTRACTS, CLAN_EMBLEMS, CLAN_MEMBER_BONUS, getContractProgress, validateClanName } from '../game/clans';
import type { ClanEmblem, ClanState } from '../game/types';
import styles from '../style/Clan.module.scss';

const PAGE_SIZE = 7;
const number = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
const emblemIcon = (id: ClanEmblem) => CLAN_EMBLEMS.find((emblem) => emblem.id === id)?.icon ?? '☠';
const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('ru-RU');

type Tab = 'mine' | 'all' | 'tasks';

const PipeMeter = ({ value, max, label }: { value: number; max: number; label: string }) => (
  <div className={styles.meter}>
    <div className={styles.meterLabel}><span>{label}</span><strong>{number(Math.min(value, max))} / {number(max)}</strong></div>
    <progress value={Math.min(value, max)} max={max} aria-label={label} />
  </div>
);

interface Props {
  onClose: () => void;
}

export const ClanModal = ({ onClose }: Props) => {
  const { state, dispatch, isLoading } = useGame();
  const [tab, setTab] = useState<Tab>('mine');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [emblem, setEmblem] = useState<ClanEmblem>('skull');
  const [formError, setFormError] = useState('');
  const [stamp, setStamp] = useState('');

  const clan = state.clan;
  const selected = state.clanDirectory.find((entry) => entry.id === selectedId) ?? null;
  const war = state.clanWar;
  const sorted = useMemo(() => [...state.clanDirectory].sort((a, b) =>
    b.rating - a.rating || a.name.localeCompare(b.name, 'ru')), [state.clanDirectory]);
  const filtered = useMemo(() => sorted.filter((entry) => entry.name.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'))), [sorted, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(Math.min(page, pageCount - 1) * PAGE_SIZE, (Math.min(page, pageCount - 1) + 1) * PAGE_SIZE);

  useEffect(() => {
    if (state.lastMessage !== 'Убежище основано!' && !state.lastMessage.startsWith('Контракт выполнен!')) return;
    setStamp(state.lastMessage === 'Убежище основано!' ? 'УБЕЖИЩЕ ОСНОВАНО!' : 'ВЫПОЛНЕНО');
    const timer = window.setTimeout(() => setStamp(''), 2200);
    return () => window.clearTimeout(timer);
  }, [state.lastMessage]);

  const create = () => {
    const error = validateClanName(name, state.clanDirectory);
    if (error || state.gold < CLAN_CREATE_GOLD || clan) {
      setFormError(error ?? (clan ? 'Вы уже в убежище.' : `Нужно 🪙 ${number(CLAN_CREATE_GOLD)} припасов.`));
      return;
    }
    dispatch({ type: 'CREATE_CLAN', name, emblem });
    setFormError('');
    setShowCreate(false);
    setTab('mine');
  };

  const handleEscape = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    if (showCreate) setShowCreate(false);
    else if (selectedId) setSelectedId(null);
    else onClose();
  };

  const renderCard = (entry: ClanState, inDialog = false) => (
    <>
      <div className={styles.cardTitle}>
        <span className={styles.cardEmblem} aria-hidden="true">{emblemIcon(entry.emblem)}</span>
        <div>
          <h3>{entry.name}</h3>
          <span className={styles.muted}>Основано {formatDate(entry.createdAt)}</span>
        </div>
      </div>
      {entry.id === clan?.id && <span className={styles.ownTag}>ВАШ КЛАН</span>}
      <p className={styles.description}>{entry.description}</p>
      <div className={styles.stats}>
        <div><span>Выживаемость</span><strong>⭐ {number(entry.rating)}</strong></div>
        <div><span>Контракты</span><strong>+{number(entry.taskPoints)}</strong></div>
        <div><span>Участники</span><strong>👥 {entry.members.length}/{CLAN_MAX_MEMBERS}</strong></div>
      </div>
      <p className={styles.formula}>Рейтинг = очки контрактов + {entry.members.length} × {CLAN_MEMBER_BONUS} за выживших</p>
      <h4>Состав убежища</h4>
      <ul className={styles.roster}>
        {entry.members.map((member) => <li key={member.id}><span>{member.name}</span><span>{member.role === 'leader' ? '★ Лидер' : 'Выживший'}</span></li>)}
      </ul>
      {entry.leaderId === state.playerId && (
        <section className={styles.applications}>
          <h4>Заявки по рации · {entry.applications.length}</h4>
          {entry.applications.length === 0 ? <p className={styles.muted}>Эфир тих. Новых заявок нет.</p> : entry.applications.map((request) => (
            <div className={styles.request} key={request.userId}>
              <span>{request.userName}</span>
              <div>
                <button type="button" className={styles.accept} onClick={() => dispatch({ type: 'RESOLVE_CLAN_APPLICATION', clanId: entry.id, userId: request.userId, accept: true })}>Принять</button>
                <button type="button" className={styles.plainButton} onClick={() => dispatch({ type: 'RESOLVE_CLAN_APPLICATION', clanId: entry.id, userId: request.userId, accept: false })}>Отклонить</button>
              </div>
            </div>
          ))}
        </section>
      )}
      {inDialog && !clan && (
        <div className={styles.cardActions}>
          {state.pendingClanId === entry.id ? (
            <button type="button" className={styles.plainButton} onClick={() => dispatch({ type: 'CANCEL_CLAN_APPLICATION' })}>Отозвать заявку</button>
          ) : (
            <button type="button" className={styles.redButton} disabled={!!state.pendingClanId || entry.members.length >= CLAN_MAX_MEMBERS} onClick={() => dispatch({ type: 'APPLY_TO_CLAN', clanId: entry.id })}>📻 Подать заявку</button>
          )}
          {!!state.pendingClanId && state.pendingClanId !== entry.id && <span className={styles.muted}>У вас уже есть заявка в другом убежище.</span>}
        </div>
      )}
    </>
  );

  return (
    <div className={styles.backdrop} onClick={onClose} onKeyDown={handleEscape}>
      <section className={styles.board} role="dialog" aria-modal="true" aria-label="Убежища выживших" onClick={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <span className={styles.lamp} aria-hidden="true" />
          <div><p className={styles.eyebrow}>ЭРГЕЙТ · ЧАСТОТА 13.7</p><h2>УБЕЖИЩА ВЫЖИВШИХ</h2><p>Найди своих. Переживи ночь.</p></div>
          <button className={styles.close} type="button" aria-label="Закрыть кланы" onClick={onClose}>✕</button>
        </header>

        <nav className={styles.tabs} role="tablist" aria-label="Разделы убежищ">
          {([['mine', 'МОЙ КЛАН'], ['all', 'ВСЕ КЛАНЫ'], ['tasks', 'ЗАДАНИЯ']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? styles.tabActive : styles.tab} onClick={() => { setTab(id); setSelectedId(null); }}>{label}</button>
          ))}
        </nav>

        <div className={styles.content} role="tabpanel">
          {isLoading ? <p className={styles.empty}>Ищем сигнал выживших…</p> : (
            <>
              {tab === 'mine' && (clan ? (
                <>
                  <article className={styles.metalCard}>{renderCard(clan)}</article>
                  <section className={styles.metalCard}>
                    <h3 className={styles.sectionTitle}>⚔ Клановая война</h3>
                    <div className={styles.warStats}><span>Побед: {clan.warWins}</span><span>Поражений: {clan.warLosses}</span><span>Серия: {clan.warStreak}</span></div>
                    {war ? <>
                      <p>Противник: <strong>{war.enemyName}</strong> · рейтинг {war.enemyRating}</p>
                      <PipeMeter label="Очки противника" value={war.clanScore} max={Math.max(1, war.enemyScore)} />
                      <PipeMeter label="Ваш вклад" value={war.contributions} max={CLAN_WAR_FULL_CONTRIB} />
                      <div className={styles.actions}>
                        <button type="button" className={styles.redButton} disabled={war.claimed || state.zhetons < CLAN_WAR_CONTRIB_COST || war.contributions >= CLAN_WAR_FULL_CONTRIB} onClick={() => dispatch({ type: 'CLAN_WAR_CONTRIBUTE' })}>Взнос · {CLAN_WAR_CONTRIB_COST} жетон</button>
                        <button type="button" className={styles.accept} disabled={war.claimed || war.contributions < CLAN_WAR_MIN_CONTRIB} onClick={() => dispatch({ type: 'CLAN_WAR_CLAIM' })}>{war.claimed ? 'Награда получена' : 'Забрать награду'}</button>
                      </div>
                    </> : <p className={styles.muted}>Рация молчит. Противник пока не найден.</p>}
                    {state.clanWarHistory.length > 0 && <div className={styles.history}><h4>Журнал вылазок</h4>{state.clanWarHistory.slice(0, 5).map((entry) => <p key={`${entry.dateKey}-${entry.enemyName}`}>{entry.win ? '✓' : '✕'} {entry.dateKey} · {entry.enemyName} · {entry.clanScore}:{entry.enemyScore}</p>)}</div>}
                  </section>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.silhouette} aria-hidden="true">🧟</span>
                  <h3>В одиночку долго не выжить</h3>
                  <p>Соберите своё убежище или найдите группировку на доске выживших.</p>
                  <button type="button" className={styles.redButton} onClick={() => setShowCreate(true)}>☠ СОЗДАТЬ УБЕЖИЩЕ</button>
                  <span className={styles.price}>🪙 {number(CLAN_CREATE_GOLD)} припасов · у вас {number(state.gold)}</span>
                  {state.pendingClanId && <p>📻 Заявка отправлена. <button type="button" className={styles.linkButton} onClick={() => dispatch({ type: 'CANCEL_CLAN_APPLICATION' })}>Отозвать</button></p>}
                </div>
              ))}

              {tab === 'all' && <section className={styles.leaderboard}>
                <div className={styles.boardHeading}><div><p className={styles.eyebrow}>ОБЪЯВЛЕНИЯ · ЛОКАЛЬНЫЙ РЕЖИМ</p><h3>Доска выживших</h3></div>{!clan && <button type="button" className={styles.redButton} onClick={() => setShowCreate(true)}>☠ СОЗДАТЬ УБЕЖИЩЕ <span>🪙 {number(CLAN_CREATE_GOLD)}</span></button>}</div>
                <label className={styles.searchLabel} htmlFor="clan-search">Найти убежище…</label>
                <input id="clan-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Название группировки" className={styles.search} />
                {filtered.length === 0 ? <div className={styles.emptyState}><span className={styles.silhouette} aria-hidden="true">🧟</span><h3>Пока никого… город мёртв</h3><p>{query ? 'По вашему запросу нет сигналов.' : 'Станьте первым, кто соберёт убежище.'}</p></div> : <>
                  <div className={styles.tableWrap}><table><caption className={styles.srOnly}>Рейтинг убежищ по выживаемости</caption><thead><tr><th scope="col">#</th><th scope="col">Эмблема</th><th scope="col">Имя клана</th><th scope="col">👥 Участники</th><th scope="col">⭐ Рейтинг выживаемости</th></tr></thead><tbody>
                    {visible.map((entry) => {
                      const rank = sorted.findIndex((candidate) => candidate.id === entry.id) + 1;
                      return <tr key={entry.id} className={entry.id === clan?.id ? styles.ownRow : ''} onClick={() => setSelectedId(entry.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(entry.id); } }} tabIndex={0} aria-label={`Открыть карточку ${entry.name}`}>
                        <td>{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}</td><td className={styles.emblemCell}>{emblemIcon(entry.emblem)}</td><td><strong>{entry.name}</strong>{entry.id === clan?.id && <small className={styles.ownTag}>ВАШ КЛАН</small>}</td><td>{entry.members.length}</td><td className={styles.ratingCell}>{number(entry.rating)}</td>
                      </tr>;
                    })}
                  </tbody></table></div>
                  <div className={styles.pagination}><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>← Назад</button><span>Страница {Math.min(page, pageCount - 1) + 1} / {pageCount}</span><button type="button" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Дальше →</button></div>
                </>}
              </section>}

              {tab === 'tasks' && (clan ? <section className={styles.contracts}>
                <div className={styles.boardHeading}><div><p className={styles.eyebrow}>ПРИКОЛОТО К ДОСКЕ</p><h3>Контракты на выживание</h3></div><span className={styles.price}>⭐ {number(clan.rating)} рейтинга</span></div>
                <p className={styles.muted}>Прогресс пополняется за победы над заражёнными, рейды, аптечки и крафт баррикад. Завершённый контракт даёт очки один раз за период.</p>
                {CLAN_CONTRACTS.map((contract) => {
                  const progress = getContractProgress(clan, contract);
                  return <article className={styles.contract} key={contract.id}>
                    <div className={styles.contractHeader}><span className={styles.contractIcon} aria-hidden="true">{contract.icon}</span><div><h4>{contract.title}</h4><p>{contract.description}</p></div><strong>+{number(contract.points)} ⭐</strong></div>
                    <PipeMeter label={contract.title} value={progress.value} max={contract.target} />
                    <div className={styles.contractFooter}><span>{contract.period === 'daily' ? 'ЕЖЕДНЕВНО' : 'ЕЖЕНЕДЕЛЬНО'}</span>{progress.completed && <span className={styles.done}>✓ ВЫПОЛНЕНО</span>}</div>
                  </article>;
                })}
              </section> : <div className={styles.emptyState}><span className={styles.silhouette} aria-hidden="true">📜</span><h3>Контракты ждут группировку</h3><p>Сначала создайте убежище или вступите в существующее.</p><button className={styles.plainButton} type="button" onClick={() => setTab('all')}>К доске выживших →</button></div>)}
            </>
          )}
          {state.lastMessage && <p className={styles.status} role="status">{state.lastMessage}</p>}
        </div>
      </section>

      {selected && <div className={styles.overlay} onClick={() => setSelectedId(null)}><section className={styles.detail} role="dialog" aria-modal="true" aria-label={`Убежище ${selected.name}`} onClick={(event) => event.stopPropagation()}><button type="button" className={styles.backButton} onClick={() => setSelectedId(null)}>← К доске выживших</button>{renderCard(selected, true)}</section></div>}

      {showCreate && <div className={styles.overlay} onClick={() => setShowCreate(false)}><section className={styles.paper} role="dialog" aria-modal="true" aria-label="Создать убежище" onClick={(event) => event.stopPropagation()}><span className={styles.tape} aria-hidden="true" /><p className={styles.paperEyebrow}>ЗАПИСКА № 001 · ТОЛЬКО ДЛЯ СВОИХ</p><h3>Новое убежище</h3><p>Запишите название. Оставьте метку. Другие выжившие найдут вас.</p>
        <form onSubmit={(event) => { event.preventDefault(); create(); }}>
          <label htmlFor="clan-name">Название убежища / группировки</label>
          <input id="clan-name" autoFocus value={name} onChange={(event) => { setName(event.target.value); setFormError(''); }} minLength={3} maxLength={20} placeholder="Например, Последний рубеж" required />
          <fieldset><legend>Эмблема убежища</legend><div className={styles.emblemOptions}>{CLAN_EMBLEMS.map((option) => <label key={option.id} className={emblem === option.id ? styles.emblemSelected : styles.emblemOption}><input type="radio" name="emblem" value={option.id} checked={emblem === option.id} onChange={() => setEmblem(option.id)} /><span aria-hidden="true">{option.icon}</span><small>{option.label}</small></label>)}</div></fieldset>
          <p className={styles.paperPrice}>Стоимость: 🪙 {number(CLAN_CREATE_GOLD)} припасов · осталось после: {number(Math.max(0, state.gold - CLAN_CREATE_GOLD))}</p>
          {formError && <p className={styles.error} role="alert">{formError}</p>}
          <div className={styles.actions}><button type="submit" className={styles.redButton}>ОСНОВАТЬ</button><button type="button" className={styles.plainButton} onClick={() => setShowCreate(false)}>ОТМЕНА</button></div>
        </form>
      </section></div>}
      {stamp && <div className={styles.stamp} role="status">{stamp}</div>}
    </div>
  );
};
