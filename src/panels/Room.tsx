import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';
import {
  LOCATIONS,
  SHELTER_ITEMS,
  ROOM_SKINS,
  CAPS_PACKS,
  getRoomSkin,
  getDefaultSkin,
  getNextLockedRoom,
} from '../game/constants';
import { BOSSES } from '../game/bosses';
import type { ShelterItemId } from '../game/types';
import { roomDropChance } from '../game/survival';
import styles from '../style/Room.module.scss';

const number = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

const bossForRoom = (roomId: string) => BOSSES.find((b) => b.reward.room === roomId);

type Tab = 'rooms' | 'shop' | 'skins';
type Confirm = { kind: 'item'; id: ShelterItemId } | { kind: 'skin'; id: string };

interface Props {
  onClose: () => void;
}

export const RoomModal = ({ onClose }: Props) => {
  const { state, dispatch, serverMode } = useGame();
  const [tab, setTab] = useState<Tab>('rooms');
  const [currentIndex, setCurrentIndex] = useState(() => Math.max(0, LOCATIONS.findIndex((room) => room.id === state.currentLocation)));
  const [showHint, setShowHint] = useState(false);
  const [hintRoomId, setHintRoomId] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [previewSkinId, setPreviewSkinId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [stamp, setStamp] = useState('');

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!stamp) return;
    const id = window.setTimeout(() => setStamp(''), 2200);
    return () => window.clearTimeout(id);
  }, [stamp]);

  const handleEscape = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    if (confirm) setConfirm(null);
    else if (showTopUp) setShowTopUp(false);
    else if (showHint) setShowHint(false);
    else onClose();
  };

  const enter = (roomId: string) => {
    dispatch({ type: 'CHANGE_LOCATION', locationId: roomId });
    onClose();
  };

  const buyItem = (itemId: ShelterItemId) => {
    const item = SHELTER_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const owned = itemId === 'bed' ? state.shelterBed : itemId === 'generator' ? state.shelterGenerator : false;
    if (owned) { setToast('Уже куплено.'); return; }
    if (itemId === 'open_room' && !getNextLockedRoom(state.unlockedRooms)) {
      setToast('Все комнаты уже открыты.');
      return;
    }
    if (state.caps < item.price) { setToast('Не хватает крышек 🥤'); return; }
    setConfirm({ kind: 'item', id: itemId });
  };

  const buySkin = (skinId: string) => {
    const skin = getRoomSkin(skinId);
    if (!skin) return;
    if (state.caps < skin.price) { setToast('Не хватает крышек 🥤'); return; }
    setConfirm({ kind: 'skin', id: skinId });
  };

  const applySkin = (skinId: string) => {
    dispatch({ type: 'APPLY_SKIN', skinId });
    onClose();
  };

  const confirmBuy = () => {
    if (!confirm) return;
    if (confirm.kind === 'item') dispatch({ type: 'BUY_SHELTER_ITEM', itemId: confirm.id });
    else dispatch({ type: 'BUY_SKIN', skinId: confirm.id });
    setConfirm(null);
    setStamp('КУПЛЕНО ✓');
  };

  const roomName = LOCATIONS.find((r) => r.id === state.currentLocation)?.name ?? state.currentLocation;
  const displayedRoom = LOCATIONS[currentIndex];
  const displayedUnlocked = state.unlockedRooms.includes(displayedRoom.id);
  const roomAvailable = state.pendingRoomDrop?.dropped && state.pendingRoomDrop.roomId === displayedRoom.id;
  const currentChance = state.battle?.source === 'boss' && state.battle.outcome === 'fighting'
    ? roomDropChance(state.battle.damageDealt)
    : state.lastRoomRoll?.chance ?? roomDropChance(0);
  const roomSkins = ROOM_SKINS.filter((s) => s.roomId === state.currentLocation);
  const defaultSkin = getDefaultSkin(state.currentLocation);
  const selectedSkinId = state.selectedSkins[state.currentLocation] ?? defaultSkin?.id;
  const previewSkin = getRoomSkin(previewSkinId ?? selectedSkinId ?? roomSkins[0]?.id);

  const confirmInfo = confirm
    ? confirm.kind === 'item'
      ? { icon: '🥤', name: SHELTER_ITEMS.find((i) => i.id === confirm.id)?.name ?? '', description: SHELTER_ITEMS.find((i) => i.id === confirm.id)?.description ?? '', price: SHELTER_ITEMS.find((i) => i.id === confirm.id)?.price ?? 0 }
      : (() => { const s = getRoomSkin(confirm.id); return { icon: '🎨', name: s?.name ?? '', description: s?.description ?? '', price: s?.price ?? 0 }; })()
    : null;

  // Шаги подсказки.
  const lockedRoom = hintRoomId
    ? LOCATIONS.find((r) => r.id === hintRoomId) ?? null
    : getNextLockedRoom(state.unlockedRooms);
  const hintBoss = lockedRoom ? bossForRoom(lockedRoom.id) : undefined;
  const steps: string[] = [];
  if (lockedRoom && hintBoss) {
    steps.push(`Достигни уровня и победи босса «${hintBoss.name}».`);
    steps.push(`…или заплати 500 🥤 и открой «${lockedRoom.name}» сразу.`);
  } else if (lockedRoom) {
    steps.push('Собери ресурсы или заплати 500 🥤.');
  } else {
    steps.push('ДВЕРЬ ОТКРЫТА.');
    steps.push('Все комнаты убежища доступны.');
  }
  steps.push('Нажми «ОТКРЫТЬ ДВЕРЬ».');

  return (
    <div className={styles.backdrop} onClick={onClose} onKeyDown={handleEscape}>
      <section className={styles.board} role="dialog" aria-modal="true" aria-label="Комната-убежище" onClick={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <span className={styles.lamp} aria-hidden="true" />
          <div><p className={styles.eyebrow}>ЛИЧНЫЙ БУНКЕР · АВАРИЙНОЕ ОСВЕЩЕНИЕ</p><h2>УБЕЖИЩЕ</h2><p>Ржавая дверь. Тусклый свет. Твоё место в мёртвом городе.</p></div>
          <button className={styles.close} type="button" aria-label="Закрыть комнату" onClick={onClose}>✕</button>
        </header>

        <div className={styles.balanceRow}>
          <span className={styles.capsPill}>🥤 {number(state.caps)} крышек</span>
          {!serverMode && <button
            type="button"
            className={styles.plainButton}
            title="Тест: +100 крышек"
            onClick={() => dispatch({ type: 'ADD_RESOURCE', resource: 'caps', amount: 100 })}
          >
            +
          </button>}
          <button type="button" className={styles.plainButton} onClick={() => setShowTopUp(true)}>🥤 Пополнить</button>
          <button type="button" className={styles.plainButton} onClick={() => { setHintRoomId(null); setShowHint(true); }}>? Как получить?</button>
        </div>

        <section className={styles.summary} aria-label="Состояние убежища">
          <strong>ВАШЕ УБЕЖИЩЕ</strong>
          <span>🏠 Комната: {roomName}</span>
          <span>🛏️ Кровать: {state.shelterBed ? 'установлена · +50% к максимуму энергии при покупке' : 'не установлена'}</span>
          <span>⚡ Генератор: {state.shelterGenerator ? 'работает · восстановление энергии ×2' : 'не установлен'}</span>
        </section>

        <nav className={styles.tabs} role="tablist" aria-label="Разделы убежища">
          {([['rooms', 'КОМНАТЫ'], ['shop', 'ОБОРУДОВАНИЕ'], ['skins', 'ОФОРМЛЕНИЕ']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? styles.tabActive : styles.tab} onClick={() => { setTab(id); if (id === 'skins') setPreviewSkinId(null); }}>{label}</button>
          ))}
        </nav>

        <div className={styles.content} role="tabpanel">
          {tab === 'rooms' && (
            <section className={styles.rooms} aria-label="Карусель комнат">
              <div className={styles.roomPhoto}>
                <span className={styles.photoTape} aria-hidden="true" />
                <img src={`/${displayedRoom.bg}`} alt={`Комната ${displayedRoom.name}`} />
                <span className={styles.photoStatus}>
                  {displayedRoom.id === state.currentLocation ? '✅ ВЫ ЗДЕСЬ' : displayedUnlocked ? '🟢 ДОСТУПНА' : roomAvailable ? '🎁 МОЖНО ЗАБРАТЬ' : '🔒 ЗАКРЫТА'}
                </span>
              </div>
              <h3>{displayedRoom.name}</h3>
              <p>{displayedUnlocked ? 'Убежище можно выбрать сейчас.' : roomAvailable ? 'Комната найдена! Заберите её.' : bossForRoom(displayedRoom.id) ? `Победите босса «${bossForRoom(displayedRoom.id)?.name}» и выиграйте в розыгрыше по урону.` : 'Наносите урон боссам, чтобы найти это убежище.'}</p>
              <div className={styles.chanceLabel}><span>Шанс комнаты по урону</span><strong>{Math.round(currentChance * 100)}% / 50%</strong></div>
              <progress className={styles.chanceMeter} value={currentChance * 100} max={50} aria-label="Шанс выпадения комнаты" />
              {state.lastRoomRoll && <p className={styles.ownTag}>{state.lastRoomRoll.dropped ? 'ВЫПАЛО' : 'НЕ ВЫПАЛО'} · урон {number(state.lastRoomRoll.damage)}</p>}
              <div className={styles.roomControls}>
                <button type="button" className={styles.plainButton} onClick={() => setCurrentIndex((currentIndex - 1 + LOCATIONS.length) % LOCATIONS.length)}>◀ Назад</button>
                {roomAvailable ? <button type="button" className={styles.accept} onClick={() => { dispatch({ type: 'CLAIM_ROOM' }); setStamp('ВЫПАЛО · ПОЛУЧЕНО'); }}>ЗАБРАТЬ КОМНАТУ</button>
                  : displayedUnlocked ? <button type="button" className={styles.accept} disabled={displayedRoom.id === state.currentLocation} onClick={() => enter(displayedRoom.id)}>ВОЙТИ</button>
                    : <button type="button" className={styles.redButton} onClick={() => { setHintRoomId(displayedRoom.id); setShowHint(true); }}>УСЛОВИЯ</button>}
                <button type="button" className={styles.plainButton} onClick={() => setCurrentIndex((currentIndex + 1) % LOCATIONS.length)}>Вперёд ▶</button>
              </div>
              <div className={styles.dots} aria-label={`Комната ${currentIndex + 1} из ${LOCATIONS.length}`}>
                {LOCATIONS.map((room, index) => <button key={room.id} type="button" className={index === currentIndex ? styles.dotActive : styles.dot} aria-label={`Показать комнату ${room.name}`} aria-current={index === currentIndex ? 'true' : undefined} onClick={() => setCurrentIndex(index)} />)}
              </div>
            </section>
          )}

          {tab === 'shop' && (
            <section className={styles.shop}>
              <p className={styles.muted}>Улучшения действуют постоянно после покупки. Ящик и набор можно купить повторно — их содержимое выдаётся сразу. Цены указаны в крышках.</p>
              <div className={styles.shopGrid}>
                {SHELTER_ITEMS.map((item) => {
                  const owned = item.id === 'bed' ? state.shelterBed : item.id === 'generator' ? state.shelterGenerator : false;
                  const affordable = state.caps >= item.price;
                  return (
                    <button type="button" key={item.id} className={`${styles.shopItem} ${owned ? styles.shopOwned : ''}`} onClick={() => buyItem(item.id)}>
                      <span className={styles.shopIcon} aria-hidden="true">{item.icon}</span>
                      <div className={styles.shopInfo}>
                        <h4>{item.name}</h4>
                        <p>{item.description}</p>
                      </div>
                      <span className={`${styles.price} ${!affordable && !owned ? styles.priceLocked : ''}`}>{owned ? 'УСТАНОВЛЕНО' : `🥤 ${item.price}`}</span>
                    </button>
                  );
                })}
              </div>
              {state.lastMessage && <p className={styles.status} role="status">Последнее действие: {state.lastMessage}</p>}
            </section>
          )}

          {tab === 'skins' && (
            <section className={styles.skins}>
              <p className={styles.muted}>Оформление комнаты «{roomName}» меняет фон главного экрана и не влияет на характеристики. Выберите вариант, чтобы посмотреть его до покупки.</p>

              {previewSkin && (
                <div className={styles.skinPreview}>
                  <img className={styles.skinSwatch} src={`/${previewSkin.bg}`} alt={`Предпросмотр: ${previewSkin.name}`} />
                  <div className={styles.skinPreviewInfo}>
                    <h4>{previewSkin.name}</h4>
                    <p>{previewSkin.description}</p>
                    <div className={styles.actions}>
                      {previewSkin.id === selectedSkinId ? (
                        <span className={styles.done}>✓ ПРИМЕНЕНО</span>
                      ) : (previewSkin.price === 0 || state.ownedSkins.includes(previewSkin.id)) ? (
                        <button type="button" className={styles.accept} onClick={() => applySkin(previewSkin.id)}>ПРИМЕНИТЬ</button>
                      ) : (
                        <button type="button" className={styles.redButton} onClick={() => buySkin(previewSkin.id)}>КУПИТЬ 🥤 {previewSkin.price}</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.skinList}>
                {roomSkins.map((skin) => {
                  const owned = skin.price === 0 || state.ownedSkins.includes(skin.id);
                  const applied = skin.id === selectedSkinId;
                  const isPreview = skin.id === previewSkin?.id;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      className={`${styles.skinCard} ${isPreview ? styles.skinActive : ''} ${applied ? styles.skinApplied : ''}`}
                      onClick={() => setPreviewSkinId(skin.id)}
                    >
                      <img className={styles.miniSwatch} src={`/${skin.bg}`} alt="" />
                      <span className={styles.skinName}>{skin.name}</span>
                      <span className={styles.skinStatus}>{applied ? 'Применено' : owned ? 'Куплено' : `🥤 ${skin.price}`}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {toast && <p className={styles.status} role="status">{toast}</p>}
        </div>
      </section>

      {showHint && (
        <div className={styles.overlay} onClick={() => setShowHint(false)}>
          <section className={styles.paper} role="dialog" aria-modal="true" aria-label="Как получить комнату" onClick={(event) => event.stopPropagation()}>
            <span className={styles.tape} aria-hidden="true" />
            <p className={styles.paperEyebrow}>ЗАПИСКА № 002 · ТОЛЬКО ДЛЯ СВОИХ</p>
            <h3>📌 Как открыть убежище</h3>
            <ol className={styles.steps}>
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className={styles.warning}>⚠️ За стеной бродят они… не задерживайся.</p>
            <div className={styles.actions}><button type="button" className={styles.redButton} onClick={() => setShowHint(false)}>ПОНЯТНО</button></div>
          </section>
        </div>
      )}

      {showTopUp && (
        <div className={styles.overlay} onClick={() => setShowTopUp(false)}>
          <section className={styles.paper} role="dialog" aria-modal="true" aria-label="Пополнить крышки" onClick={(event) => event.stopPropagation()}>
            <span className={styles.tape} aria-hidden="true" />
            <p className={styles.paperEyebrow}>ЯЩИК С ПРИПАСАМИ · ДОНАТ</p>
            <h3>📦 Пополнить крышки</h3>
            {serverMode ? <p role="status">Покупка крышек пока недоступна. Реальные платежи не подключены, списания не будет.</p> : <>
            <p>Крышки добываются за реальные деньги / редкие награды.</p>
            <div className={styles.packList}>
              {CAPS_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className={styles.packCard}
                  title="Тест: начислить пакет бесплатно"
                  onClick={() => {
                    dispatch({ type: 'ADD_RESOURCE', resource: 'caps', amount: pack.caps + pack.bonus });
                    setShowTopUp(false);
                    setStamp(`+${number(pack.caps + pack.bonus)} 🥤`);
                  }}
                >
                  <span>Пакет «{pack.id}»</span>
                  <strong>🥤 {number(pack.caps + pack.bonus)}</strong>
                  <span className={styles.packPrice}>₽ {pack.price} · тест</span>
                </button>
              ))}
            </div>
            <p className={styles.muted}>Тестовый режим: пакеты начисляются бесплатно. Оплата через провайдера и подтверждение сервером — позже.</p></>}
            <div className={styles.actions}><button type="button" className={styles.plainButton} onClick={() => setShowTopUp(false)}>ЗАКРЫТЬ</button></div>
          </section>
        </div>
      )}

      {confirm && confirmInfo && (
        <div className={styles.overlay} onClick={() => setConfirm(null)}>
          <section className={styles.paper} role="dialog" aria-modal="true" aria-label="Подтвердить покупку" onClick={(event) => event.stopPropagation()}>
            <span className={styles.tape} aria-hidden="true" />
            <p className={styles.paperEyebrow}>ЗАПИСКА ТОРГОВЦА · СДЕЛКА</p>
            <h3>Подтвердить покупку</h3>
            <div className={styles.confirmLine}>
              <span className={styles.confirmIcon} aria-hidden="true">{confirmInfo.icon}</span>
              <div><strong>{confirmInfo.name}</strong><p>{confirmInfo.description}</p></div>
            </div>
            <p className={styles.paperPrice}>К оплате: 🥤 {confirmInfo.price} · у вас {number(state.caps)}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.redButton} onClick={confirmBuy}>КУПИТЬ</button>
              <button type="button" className={styles.plainButton} onClick={() => setConfirm(null)}>ОТМЕНА</button>
            </div>
          </section>
        </div>
      )}

      {stamp && <div className={styles.stamp} role="status">{stamp}</div>}
    </div>
  );
};
