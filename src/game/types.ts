export type Role = 'imposter' | 'crewmate' | 'protector';

export type TaskType =
  | 'frequency'
  | 'morse'
  | 'satellite'
  | 'backup'
  | 'solar'
  | 'power'
  | 'magnetic'
  | 'password'
  | 'ice'
  | 'dna';

export interface TaskStation {
  id: number;
  x: number;
  y: number;
  label: string;
  taskType: TaskType;
  completed: boolean;
}

export interface TaskChallenge {
  type: TaskType;
  stationId: number;
  prompt: string;
  answer: string;
  // frequency
  targetAngle?: number;
  // morse
  morsePattern?: ('short' | 'long')[];
  // satellite
  targetRotation?: number;
  // backup - auto progress
  duration?: number;
  // password
  passwordDigits?: string;
  // dna
  dnaOffset?: number;
  // ice
  tapsRequired?: number;
}

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
  doingTask: boolean;
  taskStationId: number | null;
  taskProgress: number; // 0-1
}

export interface FreezeProjectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  startTime: number;
  duration: number; // ms
}

export interface GameState {
  players: Player[];
  phase: 'lobby' | 'playing' | 'gameover';
  winner: 'imposters' | 'crew' | null;
  timeElapsed: number;
  mapWidth: number;
  mapHeight: number;
  taskStations: TaskStation[];
  tasksCompleted: number;
  totalTasks: number;
  activeTask: TaskChallenge | null;
  projectiles: FreezeProjectile[];
}

export const PLAYER_RADIUS = 18;
export const KILL_RANGE = 50;
export const FREEZE_RANGE = 120;
export const FREEZE_DURATION = 5000;
export const KILL_COOLDOWN = 5000;
export const FREEZE_COOLDOWN = 10000;
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1200;
export const TASK_RANGE = 60;
export const TOTAL_TASKS = 10;
