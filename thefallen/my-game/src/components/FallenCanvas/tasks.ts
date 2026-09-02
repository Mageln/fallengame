import { Task } from './types';

export const TASKS: Task[] = [
  { id: 1, name: "Развести терпилу", icon: "🔫", cost: 20 },
  { id: 2, name: "Набить татуху", icon: "💉", cost: 35 },
  { id: 3, name: "Сыграть в карты", icon: "🃏", cost: 15 },
  { id: 4, name: "Покачать бицуху", icon: "💪", cost: 10 },
];

export const TASK_COSTS: Record<number, number> = {
  1: 20,
  2: 35,
  3: 15,
  4: 10,
};

export const TASK_REWARDS: Record<number, { type: string; value: number }> = {
  1: { type: 'authority', value: 15 },
  2: { type: 'authority', value: 30 },
  3: { type: 'cigarettes', value: 10 },
  4: { type: 'energy', value: 5 },
};