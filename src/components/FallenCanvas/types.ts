export interface CanvasTask {
  id: string;
  name: string;
  icon: string;
  cost: number;
}

export interface PrisonCanvasProps {
  onTaskComplete: (type: string) => void;
  onResourceClick?: (id: string) => void;
  onZombieClick?: () => void;
  energy: number;
  maxEnergy: number;
  authority: number;
  spicki?: number;
  bullets?: number;
  gold?: number;
  zhetons?: number;
  playerName: string;
  level: number;
  status: string;
  zombieHealth?: number;
  maxZombieHealth?: number;
  isZombieAlive?: boolean;
  appearance?: number;
  tasks?: CanvasTask[];
}

export interface Task {
  id: number | string;
  name: string;
  icon: string;
  cost: number;
  reward?: {
    type: string;
    value: number;
  };
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Resource {
  icon: string;
  value: number | string;
  label: string;
}

export const CANVAS_CONFIG = {
  WIDTH: 911,
  HEIGHT: 700,
} as const;

export interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

export interface GameIcons {
  energy: HTMLImageElement | null;
  spicki: HTMLImageElement | null;
  bullets: HTMLImageElement | null;
  gold: HTMLImageElement | null;
  zhetons: HTMLImageElement | null;
  plus: HTMLImageElement | null;
  zombie: HTMLImageElement | null;
}
