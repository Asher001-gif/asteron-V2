export type Role = 'imposter' | 'crewmate' | 'protector';

export type TaskType = 'math' | 'temperature' | 'email' | 'scan';

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
  answer: string;        // correct answer for math
  duration?: number;      // for scan tasks (ms)
  topic?: string;         // for email tasks
  targetTemp?: number;    // for temp tasks
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
  activeTask: TaskChallenge | null; // for human player UI
}

export const PLAYER_RADIUS = 18;
export const KILL_RANGE = 50;
export const FREEZE_RANGE = 120;
export const FREEZE_DURATION = 3000;
export const KILL_COOLDOWN = 5000;
export const FREEZE_COOLDOWN = 10000;
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1200;
export const TASK_RANGE = 60;
export const TOTAL_TASKS = 10;
