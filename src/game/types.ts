export type Role = 'imposter' | 'crewmate' | 'protector';

export interface Player {
  id: number;
  x: number;
  y: number;
  role: Role;
  alive: boolean;
  frozen: boolean;
  frozenUntil: number;
  name: string;
  isHuman: boolean;
  speed: number;
  direction: { x: number; y: number };
  aiTargetX: number;
  aiTargetY: number;
  aiChangeTime: number;
  killCooldown: number;
  freezeCooldown: number;
}

export interface GameState {
  players: Player[];
  phase: 'lobby' | 'playing' | 'gameover';
  winner: 'imposters' | 'crew' | null;
  timeElapsed: number;
  mapWidth: number;
  mapHeight: number;
}

export const PLAYER_RADIUS = 18;
export const KILL_RANGE = 50;
export const FREEZE_RANGE = 120;
export const FREEZE_DURATION = 3000;
export const KILL_COOLDOWN = 5000;
export const FREEZE_COOLDOWN = 8000;
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1200;
