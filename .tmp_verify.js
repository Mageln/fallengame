
const SHOP = {
  vest:            { st: 20, dmg: 0,  cost: 80 },
  helmet:          { st: 10, dmg: 2,  cost: 40 },
  watch:           { st: 0,  dmg: 0,  cost: 60 },
  boots:           { st: 8,  dmg: 4,  cost: 55 },
  tactical_vest:   { st: 35, dmg: 5,  cost: 200 },
  sniper_scope:    { st: 0,  dmg: 25, cost: 250 },
  lucky_amulet:    { st: 15, dmg: 10, cost: 500 },
  legendary_armor: { st: 60, dmg: 15, cost: 1200 },
};
const ALL = Object.keys(SHOP);
const GEAR_DMG = ALL.reduce((s, id) => s + SHOP[id].dmg, 0);
const GEAR_ST = ALL.reduce((s, id) => s + SHOP[id].st, 0);
const GEAR_COST = ALL.reduce((s, id) => s + SHOP[id].cost, 0);

const levelUpCost = (l) => 40 + l * 15;
const weaponUpgradeCost = (l) => 18 + l * 12;
const dmgOf = (level, wLv, up, eq) => 8 + level * 2 + (6 + wLv * 3 + (up ? 5 : 0)) + eq.reduce((s, id) => s + SHOP[id].dmg, 0);
const hpOf = (level, base, eq) => Math.max(50, Math.round(base + eq.reduce((s, id) => s + SHOP[id].st, 0) + level * 2));

function fight(dmg, pHp, bossLevel) {
  const maxHp = bossLevel * 10;
  const ans = Math.max(1, Math.round(maxHp / 40));
  let b = maxHp, p = pHp, clicks = 0;
  for (;;) {
    clicks++;
    b -= dmg;
    if (b <= 0) return { win: true, clicks, left: p, ans, bossHp: maxHp };
    p -= ans;
    if (p <= 0) return { win: false, clicks, left: 0, bossLeft: b, ans, bossHp: maxHp };
    if (clicks > 9999) return { win: false, clicks, left: p, bossLeft: b, ans, bossHp: maxHp };
  }
}

const BASE = 40; // baseStamina at start
const rows = [
  { name: 'Михалыч', bossLevel: 10, level: 1, wLv: 0 },
  { name: 'Департамент', bossLevel: 25, level: 5, wLv: 3 },
  { name: 'Тюменец', bossLevel: 50, level: 12, wLv: 6 },
  { name: 'Сотник', bossLevel: 100, level: 20, wLv: 9 },
];

console.log('=== A) БЕЗ экипировки ===');
for (const r of rows) {
  const d = dmgOf(r.level, r.wLv, false, []), h = hpOf(r.level, BASE, []);
  const f = fight(d, h, r.bossLevel);
  console.log(
    `${r.name.padEnd(12)} dmg ${String(d).padStart(3)} | pHp ${String(h).padStart(3)} | boss ${f.bossHp} ans ${f.ans}` +
    ` | надо ${String(Math.ceil(f.bossHp / d)).padStart(2)}, держит ${String(Math.floor(h / f.ans)).padStart(2)}` +
    ` | ${f.win ? 'ПОБЕДА, остаток ' + f.left : 'СМЕРТЬ, у босса ' + f.bossLeft}`
  );
}

console.log('\n=== B) ПОЛНЫЙ комплект SHOP (все 8, лимита слотов в коде нет) ===');
console.log('Σ equip dmg =', GEAR_DMG, '| Σ equip stam =', GEAR_ST, '| стоит', GEAR_COST, 'пуль');
for (const r of rows) {
  const d = dmgOf(r.level, r.wLv, true, ALL), h = hpOf(r.level, BASE, ALL);
  const f = fight(d, h, r.bossLevel);
  console.log(
    `${r.name.padEnd(12)} dmg ${String(d).padStart(3)} | pHp ${String(h).padStart(3)}` +
    ` | надо ${String(Math.ceil(f.bossHp / d)).padStart(2)}, держит ${String(Math.floor(h / f.ans)).padStart(2)}` +
    ` | ${f.win ? 'ПОБЕДА, остаток ' + f.left : 'СМЕРТЬ, у босса ' + f.bossLeft}`
  );
}

console.log('\n=== C) потолок урона ===');
console.log('max equip dmg =', GEAR_DMG, '(не 56)');
console.log('max weapon dmg =', 6 + 10 * 3 + 5, '(=41)');
console.log('damage ceiling = 8 + 41 +', GEAR_DMG, '=', 49 + GEAR_DMG, '+ level*2');
console.log('L20 full =', dmgOf(20, 10, true, ALL), '| L31 full =', dmgOf(31, 10, true, ALL));
console.log('Сотник за 6 кликов требует dmg >=', Math.ceil(1000 / 6));

console.log('\n=== D) цена прокачки, патроны ===');
let lv = 0; for (let l = 1; l < 20; l++) lv += levelUpCost(l);
let w10 = 0; for (let l = 0; l < 10; l++) w10 += weaponUpgradeCost(l);
console.log('L1->L20 =', lv, '| заточка 0->10 =', w10, '| модерн = 150 | полный SHOP =', GEAR_COST);
console.log('ИТОГО =', lv + w10 + 150 + GEAR_COST);

console.log('\n=== E) доход, пулы за энергию ===');
const tasks = [['Юг обход', 8, 10], ['Юг ящики', 10, 12], ['Юг улица', 14, 15], ['Цех', 20, 18], ['Краны', 30, 24], ['ВБ арсенал', 65, 40]];
for (const [n, b, e] of tasks) console.log(`${n.padEnd(12)} ${String(b).padStart(2)} пуль / ${String(e).padStart(2)} эн = ${(b / e).toFixed(2)} пуль/эн`);
console.log('реген:', 86400 / 5, 'эн/сутки (1 каждые 5с), кап maxEnergy');
console.log('боссы: attackReward bullets = 15 / 30 / 60 / 120 за ПОЛНЫЙ БОЙ, стоимость атаки = 0');
