import type { BattleState } from '../../game/types';

export interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

export interface UIFlags {
  showProfile?: boolean;
  showBossModal?: boolean;
  showMap?: boolean;
  showRoomModal?: boolean;
  playerName?: string;
  battle?: BattleState | null;
  // Расходники игрока для кнопок боя (в BattleState их нет — это ресурсы GameState)
  battleResources?: { medkits: number; grenades: number };
  unlockedRooms?: string[];
  currentLocation?: string;
}

export interface MapRaid {
  id: string;
  x: number;
  y: number;
  type: 'yellow' | 'red';
  name: string;
  isRunning: boolean;
  completed: boolean;
  energyCost?: number;
  startTime?: number;
  endTime?: number;
}

export interface GameData {
  energy: number;
  maxEnergy: number;
  authority: number;
  spicki: number;
  bullets: number;
  gold: number;
  premiumGold: number;
  zhetons: number;
  level: number;
  carLevel: number;
  districtName: string;
  playerName?: string;
  avatarImage?: HTMLImageElement | null;
  unreadNotifications?: number;
}

export interface ProfileData {
  level: number;
  experience: number;
  stamina: number;
  damage: number;
  luck: number;
  crit: number;
  gold: number;
  spicki: number;
  bullets: number;
  zhetons: number;
  appearance: number;
  carLevel: number;
  weapon: { name: string; level: number; broken: boolean };
}

export interface BossData {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  requirements: string;
  color: string;
  level: number;
  isSpecial: boolean;
  attackReward: { gold: number; bullets: number; zones: number };
  soloReward: { gold: number; bullets: number; tokens: number };
  roomReward?: string; // id комнаты, которая выпадает при убийстве (напр. 'location2')
}

// Состояние боя с боссом — модальное окно поверх остального интерфейса.
// Временные значения (текущее ХП, тайминги анимаций) живут в компоненте,
// отрисовка полностью строится от них и от performance.now().
export interface BossFight {
  bossId: string;
  bossName: string;
  bossColor: string;
  bossHp: number;
  bossMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  startedAt: number;
  bossHitAt: number;
  playerHitAt: number;
  missAt: number;
  lastDamage: number;
  crit: boolean;
  outcome: 'fighting' | 'won' | 'lost';
  endedAt?: number;
  reward?: { gold: number; bullets: number; room?: string | null };
  // ── Этап 3: боевые действия ──
  turn?: number;
  turnLimit?: number;
  cooldowns?: { technique: number; power: number; combo: number; evade: number };
  stunTurns?: number;
  poisonTurns?: number;
  poisonDamage?: number;
  weakPointTurns?: number;
  medkits?: number;
  grenades?: number;
  lastHit?: { damage: number; crit: boolean; missed: boolean } | null;
}

// Анимация наведения: scale — увеличение, shakeX/shakeY/rot — тряска при удержании курсора
export interface HoverAnim {
  id: string | null;
  scale: number;
  shakeX: number;
  shakeY: number;
  rot: number;
}
