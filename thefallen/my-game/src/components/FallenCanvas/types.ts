export interface PrisonCanvasProps {
   onTaskComplete: (type: string) => void;
  onResourceClick?: (id: string) => void;
  energy: number;
  maxEnergy: number;
  authority: number;
  spicki?: number;
  bullets?: number;
  playerName: string;
  level: number;
  status: string;
}

export interface Task {
  id: number;
  name: string;
  icon: string;
  cost: number;
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
}
