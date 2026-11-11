import { ResourceIcon, ResourceText } from '../components/ResourceIcon';
import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';
import { SHOP_CLOTHING, SHOP_WEAPONS } from '../game/shopCatalog';
import styles from '../style/Store.module.scss';

type Tab = 'weapon' | 'clothing';
const slotLabels = { head: 'ГОЛОВА', body: 'ТЕЛО', legs: 'ШТАНЫ', feet: 'ОБУВЬ' } as const;
type Purchase = { category: Tab; itemId: string; name: string; currency: 'gold' | 'premium'; cost: number };
const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

export const StoreModal = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<Tab>('weapon');
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [acted, setActed] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { if (purchase) setPurchase(null); else onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [purchase, onClose]);
  const items = tab === 'weapon'
    ? SHOP_WEAPONS.map((entry) => ({ id: entry.weapon.id, name: entry.weapon.name, image: entry.image, price: entry.price, currencies: ['gold', 'premium'] as readonly ('gold' | 'premium')[], effect: undefined, slotLabel: undefined, description: `Урон +${entry.weapon.baseDamage} · ${entry.weapon.ammoType === 'none' ? 'ближний бой' : 'огнестрельное'} · прочность ${entry.weapon.maxDurability}`, owned: state.weapon.id === entry.weapon.id || state.storedWeapons.some((w) => w.id === entry.weapon.id), equipped: state.weapon.id === entry.weapon.id }))
    : [...SHOP_CLOTHING].sort((a, b) => Object.keys(slotLabels).indexOf(a.slot) - Object.keys(slotLabels).indexOf(b.slot)).map((entry) => ({ id: entry.item.id, name: entry.item.name, image: entry.image, price: entry.price, currencies: entry.currencies, effect: entry.effect, slotLabel: slotLabels[entry.slot], description: `Выносливость +${entry.item.staminaBonus} · урон +${entry.item.damageBonus} · удача +${entry.item.luckBonus}`, owned: state.inventory.some((s) => s.itemId === entry.item.id) || state.equipmentIds.includes(entry.item.id), equipped: state.equipmentIds.includes(entry.item.id) }));
  const equip = (id: string) => {
    if (tab === 'weapon') dispatch({ type: 'EQUIP_SHOP_WEAPON', weaponId: id });
    else {
      const slotIndex = state.inventory.findIndex((slot) => slot.itemId === id);
      if (slotIndex >= 0) dispatch({ type: 'EQUIP_ITEM', slotIndex });
    }
    setActed(true);
  };
  return <div className={styles.backdrop} onClick={onClose}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="store-title" onClick={(event) => event.stopPropagation()}>
      <header className={styles.header}><span className={styles.lamp} /><div><small>ТОРГОВАЯ ТОЧКА · ВЫЖИВАЮТ ПОДГОТОВЛЕННЫЕ</small><h2 id="store-title">МАГАЗИН</h2></div><button type="button" aria-label="Закрыть магазин" onClick={onClose}>✕</button></header>
      <div className={styles.wallet}><span><ResourceIcon name="supplies" /> Игровое золото / припасы: {fmt(state.gold)}</span><span><ResourceIcon name="premium" /> Премиум-золото: {fmt(state.premiumGold)}</span><span>🎒 Инвентарь: {state.inventory.length}/20</span></div>
      <p className={styles.intro}>Обычные вещи доступны за игровые припасы; анимированные — за премиум-золото. Оружие и ранее добавленные вещи можно купить за любую из двух валют. Реальные платежи и пополнение премиум-баланса пока не подключены.</p>
      <nav className={styles.tabs} role="tablist" aria-label="Категории магазина"><button type="button" role="tab" aria-selected={tab === 'weapon'} className={tab === 'weapon' ? styles.active : ''} onClick={() => { setTab('weapon'); setActed(false); }}>⚔ ОРУЖИЕ</button><button type="button" role="tab" aria-selected={tab === 'clothing'} className={tab === 'clothing' ? styles.active : ''} onClick={() => { setTab('clothing'); setActed(false); }}>🧥 ОДЕЖДА</button></nav>
      <p className={styles.intro}>{tab === 'weapon' ? 'Купленное оружие можно менять здесь. Его характеристики действуют в обычных боях; на арене боссов действует бонус от урона оружия.' : 'Одежда даёт характеристики после надевания. По одному предмету на голову, тело, ноги и обувь. Надетая одежда отображается на персонаже; кепка надевается сразу при покупке.'}</p>
      {state.battle && tab === 'weapon' && <p className={styles.notice}>Сменить оружие можно после завершения боя.</p>}
      {acted && <p className={styles.notice} role="status"><ResourceText text={state.lastMessage} /></p>}
      <div className={styles.grid} role="tabpanel">{items.map((item) => <article className={styles.card} key={item.id}>
        <img className={item.effect ? styles.animatedItem : undefined} src={item.image} alt="" /><div className={styles.info}>{item.slotLabel && <small className={styles.slotLabel}>{item.slotLabel}</small>}<h3>{item.name}</h3><p>{item.description}</p>{item.effect && <strong className={styles.premiumLabel}>✦ АНИМИРОВАННЫЙ ПРЕДМЕТ</strong>}{item.equipped && <strong className={styles.equipped}>✓ {tab === 'weapon' ? 'В РУКАХ' : 'НАДЕТО'}</strong>}</div>
        <div className={styles.actions}>{item.owned ? !item.equipped && <button type="button" disabled={tab === 'weapon' && !!state.battle} onClick={() => equip(item.id)}>{tab === 'weapon' ? 'ВЗЯТЬ' : 'НАДЕТЬ'}</button> : <>
          {item.currencies.includes('gold') && <button type="button" disabled={state.gold < item.price.gold || (tab === 'clothing' && state.inventory.length >= 20)} onClick={() => setPurchase({ category: tab, itemId: item.id, name: item.name, currency: 'gold', cost: item.price.gold })}><ResourceIcon name="supplies" /> {fmt(item.price.gold)}</button>}
          {item.currencies.includes('premium') && <button type="button" disabled={state.premiumGold < item.price.premium || (tab === 'clothing' && state.inventory.length >= 20)} onClick={() => setPurchase({ category: tab, itemId: item.id, name: item.name, currency: 'premium', cost: item.price.premium })}><ResourceIcon name="premium" /> {fmt(item.price.premium)}</button>}
        </>}</div>
      </article>)}</div>
      {tab === 'weapon' && state.storedWeapons.some((w) => !SHOP_WEAPONS.some((entry) => entry.weapon.id === w.id)) && <div className={styles.owned}><h3>ВАШЕ ДРУГОЕ ОРУЖИЕ</h3>{state.storedWeapons.filter((w) => !SHOP_WEAPONS.some((entry) => entry.weapon.id === w.id)).map((w) => <button type="button" key={w.id} disabled={!!state.battle} onClick={() => { dispatch({ type: 'EQUIP_SHOP_WEAPON', weaponId: w.id }); setActed(true); }}>{w.icon} {w.name} · прочность {w.durability}/{w.maxDurability} · ВЗЯТЬ</button>)}</div>}
      {purchase && <div className={styles.overlay} onClick={() => setPurchase(null)}><section className={styles.confirm} role="dialog" aria-modal="true" aria-label="Подтверждение покупки" onClick={(event) => event.stopPropagation()}><h3>ПОДТВЕРДИТЬ ПОКУПКУ</h3><p>{purchase.name}</p><p>Цена: <ResourceIcon name={purchase.currency === 'gold' ? 'supplies' : 'premium'} /> {purchase.currency === 'gold' ? 'игровые припасы' : 'премиум-золото'} · {fmt(purchase.cost)}</p><div className={styles.actions}><button type="button" onClick={() => { dispatch({ type: 'BUY_SHOP_ITEM', category: purchase.category, itemId: purchase.itemId, currency: purchase.currency }); setPurchase(null); setActed(true); }}>КУПИТЬ</button><button type="button" onClick={() => setPurchase(null)}>ОТМЕНА</button></div></section></div>}
    </section>
  </div>;
};
