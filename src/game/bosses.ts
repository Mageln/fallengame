// Реестр боссов игрового слоя.
// ID совпадают с id боссов в отрисовке (src/components/FallenCanvas/bosses.ts),
// чтобы канвас и логика говорили об одном и том же боссе.

export interface BossDef {
  id: string;
  name: string;
  description: string;
  /** Максимальное здоровье босса */
  hp: number;
  /** Урон босса по игроку за ответный удар */
  damage: number;
  /** Награда за победу */
  reward: { gold: number; bullets: number; zhetons: number; spirt: number };
  /** Минимальный уровень игрока для вызова */
  minLevel: number;
}

export const BOSSES: BossDef[] = [
  // Канвасные боссы (id совпадают с FAKE_BOSSES для совместимости)
  {
    id: '1',
    name: 'Михалыч',
    description: 'Держит двор и следит за порядком на своей улице. Неплохо вооружён, но с ним справится тот, кто не жалеет патронов.',
    hp: 100,
    damage: 9,
    reward: { gold: 200, bullets: 15, zhetons: 0, spirt: 0 },
    minLevel: 1,
  },
  {
    id: '2',
    name: 'Департамент',
    description: 'Отряд, который зачищает подвалы от слабых. Действуют слаженно, поэтому без аптечек в бой лучше не идти.',
    hp: 250,
    damage: 11,
    reward: { gold: 500, bullets: 30, zhetons: 1, spirt: 0 },
    minLevel: 1,
  },
  {
    id: '3',
    name: 'Тюменец',
    description: 'Снайпер, который держит промзону под контролем. Бьёт точно и наказывает за любую заминку в бою.',
    hp: 500,
    damage: 14,
    reward: { gold: 900, bullets: 60, zhetons: 2, spirt: 1 },
    minLevel: 1,
  },
  {
    id: '4',
    name: 'Сотник',
    description: 'Самый защищённый босс района: броня, тяжёлое оружие и большой запас здоровья. Идти к нему стоит только с прокачанным авто.',
    hp: 1000,
    damage: 18,
    reward: { gold: 1600, bullets: 120, zhetons: 3, spirt: 1 },
    minLevel: 1,
  },
  // Игровые боссы
  {
    id: 'boss_sever',
    name: 'Северный волк',
    description: 'Вожак северной банды. Держит район силой.',
    hp: 100,
    damage: 9,
    reward: { gold: 180, bullets: 8, zhetons: 0, spirt: 0 },
    minLevel: 1,
  },
  {
    id: 'boss_cannibal',
    name: 'Людоед',
    description: 'Завёл себе ферму в канализации.',
    hp: 150,
    damage: 11,
    reward: { gold: 200, bullets: 10, zhetons: 1, spirt: 0 },
    minLevel: 2,
  },
  {
    id: 'boss_king',
    name: 'Король Арены',
    description: 'Не проиграл ни одного боя. Пока.',
    hp: 180,
    damage: 12,
    reward: { gold: 220, bullets: 10, zhetons: 1, spirt: 1 },
    minLevel: 3,
  },
  {
    id: 'boss_blood_baron',
    name: 'Кровавый барон',
    description: 'Собрал налоги со всех районов.',
    hp: 220,
    damage: 14,
    reward: { gold: 260, bullets: 12, zhetons: 1, spirt: 1 },
    minLevel: 4,
  },
  {
    id: 'boss_raider_king',
    name: 'Король рейдеров',
    description: 'Командует ордами, что грабят выживших.',
    hp: 260,
    damage: 16,
    reward: { gold: 300, bullets: 14, zhetons: 2, spirt: 1 },
    minLevel: 5,
  },
  {
    id: 'boss_forest_king',
    name: 'Король леса',
    description: 'Хозяин чащи. Говорят, он вообще не человек.',
    hp: 300,
    damage: 18,
    reward: { gold: 350, bullets: 16, zhetons: 2, spirt: 2 },
    minLevel: 6,
  },
];

export const getBoss = (id: string): BossDef | undefined => BOSSES.find((b) => b.id === id);
