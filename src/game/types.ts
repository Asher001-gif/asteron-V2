export type Role = 'imposter' | 'crewmate' | 'protector';

export type Ability = 'jail' | 'crew' | 'kill' | 'shooter';

export type TeamIndex = 0 | 1 | 2;

export const TEAM_COLORS: Record<TeamIndex, string> = {
  0: '#4a90d9', // Blue
  1: '#e03030', // Red
  2: '#3dba6f', // Green
};

export const TEAM_NAMES: Record<TeamIndex, string> = {
  0: 'BLUE',
  1: 'RED',
  2: 'GREEN',
};

export type JailTimerOption = 'off' | 10 | 20 | 'infinity';
export type SpeedOption = 'slow' | 'medium' | 'fast';

export interface GameSettings {
  tasks: number;          // 0-15
  jailTimer: JailTimerOption;
  playerCount: number;    // 2-12
  speed: SpeedOption;
  roleAbilities: [Ability, Ability, Ability]; // role1, role2, role3
  roleCounts: [number, number, number];       // sum === playerCount
}

export const DEFAULT_SETTINGS: GameSettings = {
  tasks: 10,
  jailTimer: 20,
  playerCount: 10,
  speed: 'medium',
  roleAbilities: ['crew', 'kill', 'jail'],
  roleCounts: [6, 2, 2],
};

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
  | 'dna'
  | 'door';

export interface TaskStation {
  id: number;
  x: number;
  y: number;
  label: string;
  taskType: TaskType;
  completed: boolean;
  team: TeamIndex;
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
  // door
  doorId?: number;
  doorAction?: 'open' | 'close';
}

export interface Player {
  id: number;
  x: number;
  y: number;
  role: Role;
  ability: Ability;
  team: TeamIndex;
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
  jailed: boolean;
  jailedUntil: number;
  arrestCooldown: number;
  // Bot decision-making
  actionPlanAt: number;
  actionPlanTargetId: number | null;
  actionSkipUntil: number;
  doorBusyUntil: number;
  doorBusyId: number | null;
  // Enhanced (smart) bot flag and lock-on target
  enhanced?: boolean;
  lockedTargetId?: number | null;
  // Power-up state
  shields?: number;
  speedBoostUntil?: number;
  builderCharges?: number;
  facingX?: number;
  facingY?: number;
}

export interface FreezeProjectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  startTime: number;
  duration: number; // ms
  // New (bullet) fields. When `kind === 'bullet'` the projectile travels in
  // a straight line from (x,y) along (dirX,dirY) at `speed` (px/ms) up to
  // `maxDistance` and can be dodged by moving out of its path.
  kind?: 'freeze' | 'bullet';
  ownerId?: number;
  ownerTeam?: TeamIndex;
  dirX?: number;
  dirY?: number;
  maxDistance?: number;
  hit?: boolean;
}

export interface Door {
  id: number;
  // Wall-segment endpoints (when closed, blocks movement & vision)
  x1: number; y1: number;
  x2: number; y2: number;
  // Center point used for proximity checks
  cx: number; cy: number;
  open: boolean;
  lastUsedAt: number;
  label: string;
  // Synthetic = player-placed wall block (never interactable, time-limited).
  synthetic?: boolean;
  expiresAt?: number;
}

export type PowerupKind = 'speed' | 'life' | 'builder';

export interface Powerup {
  id: number;
  kind: PowerupKind;
  x: number;
  y: number;
  spawnedAt: number;
}

export interface GameState {
  players: Player[];
  phase: 'lobby' | 'playing' | 'gameover';
  winner: TeamIndex | null;
  timeElapsed: number;
  mapWidth: number;
  mapHeight: number;
  taskStations: TaskStation[];
  tasksCompleted: number;
  totalTasks: number;
  activeTask: TaskChallenge | null;
  projectiles: FreezeProjectile[];
  recentArrest: { name: string; time: number; eventId: number } | null;
  doors: Door[];
  jailDuration: number;        // 0 = arrest disabled, Infinity = permanent
  settings: GameSettings;
  teamAbilities: [Ability, Ability, Ability];
  teamCounts: [number, number, number];
  powerups: Powerup[];
  nextPowerupSpawnAt: number;
  nextPowerupId: number;
  nextSyntheticDoorId: number;
}

export const PLAYER_RADIUS = 18;
export const KILL_RANGE = 42;
// Tight range required for the melee `kill` ability — must be hugging close.
export const KILL_CLOSE_RANGE = 34;
// Shooter can fire anywhere inside their vision; bullet then has to connect.
export const SHOOTER_RANGE = 260;
// Bullet travel speed in px / ms.
export const BULLET_SPEED = 0.95;
// Bullet hit radius around player center.
export const BULLET_HIT_RADIUS = 16;
export const FREEZE_RANGE = 120;
export const FREEZE_DURATION = 5000;
export const KILL_COOLDOWN = 5000;
export const FREEZE_COOLDOWN = 10000;
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1200;
export const TASK_RANGE = 60;
export const TOTAL_TASKS = 10;

// Jail / Arrest
export const ARREST_RANGE = 55;
export const ARREST_COOLDOWN = 10000;
export const JAIL_DURATION = 20000;
export const MAX_JAILED = 2;
export const JAIL_RECT = { x: 1290, y: 950, w: 270, h: 220 };
export const JAIL_RELEASE = { x: 800, y: 700 };

// Doors
export const DOOR_USE_COOLDOWN = 1500;
export const DOOR_INTERACT_RANGE = 55;

// Power-ups
export const POWERUP_RADIUS = 16;
export const POWERUP_PICKUP_RANGE = 28;
export const POWERUP_SPAWN_INTERVAL_MIN = 12000;
export const POWERUP_SPAWN_INTERVAL_MAX = 22000;
export const POWERUP_MAX_ON_MAP = 4;
export const SPEED_BOOST_DURATION = 5000;
export const SPEED_BOOST_MULT = 1.6;
export const BUILDER_BLOCK_LIFETIME = 40000;
export const BUILDER_BLOCK_LENGTH = 90;
