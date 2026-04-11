import {
  Player, GameState, Role,
  PLAYER_RADIUS, KILL_RANGE, FREEZE_RANGE, FREEZE_DURATION,
  KILL_COOLDOWN, FREEZE_COOLDOWN, MAP_WIDTH, MAP_HEIGHT, TASK_RANGE, TOTAL_TASKS
} from './types';
import { createTaskStations } from './tasks';

const NAMES = ['Astro', 'Nova', 'Blaze', 'Comet', 'Orbit', 'Dust', 'Nebula', 'Crater', 'Titan', 'Cosmo'];

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function createGame(playerRole: Role): GameState {
  const roles: Role[] = ['imposter', 'imposter', 'protector', 'protector',
    'crewmate', 'crewmate', 'crewmate', 'crewmate', 'crewmate', 'crewmate'];
  
  const roleIdx = roles.indexOf(playerRole);
  [roles[0], roles[roleIdx]] = [roles[roleIdx], roles[0]];
  
  for (let i = roles.length - 1; i > 1; i--) {
    const j = 1 + Math.floor(Math.random() * i);
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  const players: Player[] = roles.map((role, i) => ({
    id: i,
    x: 200 + Math.random() * (MAP_WIDTH - 400),
    y: 200 + Math.random() * (MAP_HEIGHT - 400),
    role,
    alive: true,
    frozen: false,
    frozenUntil: 0,
    name: NAMES[i],
    isHuman: i === 0,
    speed: role === 'imposter' ? 2.8 : role === 'protector' ? 2.5 : 2.2,
    direction: { x: 0, y: 0 },
    aiTargetX: MAP_WIDTH / 2,
    aiTargetY: MAP_HEIGHT / 2,
    aiChangeTime: 0,
    killCooldown: 0,
    freezeCooldown: 0,
    doingTask: false,
    taskStationId: null,
    taskProgress: 0,
  }));

  return {
    players,
    phase: 'playing',
    winner: null,
    timeElapsed: 0,
    mapWidth: MAP_WIDTH,
    mapHeight: MAP_HEIGHT,
    taskStations: createTaskStations(),
    tasksCompleted: 0,
    totalTasks: TOTAL_TASKS,
    activeTask: null,
  };
}

function updateAI(player: Player, allPlayers: Player[], now: number) {
  if (!player.alive || player.frozen || player.isHuman) return;

  const alive = allPlayers.filter(p => p.alive && p.id !== player.id);

  if (player.role === 'imposter') {
    // Priority: target crewmates only, can't kill protectors
    const crewTargets = alive.filter(p => p.role === 'crewmate');
    if (crewTargets.length === 0) {
      wanderAI(player, now);
      return;
    }
    const nearest = crewTargets.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b);

    // Flee from nearby protectors to avoid being frozen
    const nearbyProtector = alive.find(p => p.role === 'protector' && dist(player, p) < 200);
    if (nearbyProtector && Math.random() < 0.7) {
      const dx = player.x - nearbyProtector.x;
      const dy = player.y - nearbyProtector.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      player.direction = { x: dx / d, y: dy / d };
    } else {
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      player.direction = { x: dx / d, y: dy / d };
    }
  } else if (player.role === 'protector') {
    // Protector guards crewmates, only freezes imposters threatening crew
    const crew = alive.filter(p => p.role === 'crewmate');
    const imposters = alive.filter(p => p.role === 'imposter');
    
    const threateningImposter = imposters.find(imp => 
      crew.some(c => dist(imp, c) < 300)
    );
    
    if (threateningImposter && dist(player, threateningImposter) < FREEZE_RANGE + 100) {
      const dx = threateningImposter.x - player.x;
      const dy = threateningImposter.y - player.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      player.direction = { x: dx / d, y: dy / d };
    } else if (crew.length > 0) {
      const nearestCrew = crew.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b);
      if (dist(player, nearestCrew) > 150) {
        const dx = nearestCrew.x - player.x;
        const dy = nearestCrew.y - player.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        player.direction = { x: dx / d, y: dy / d };
      } else {
        wanderAI(player, now);
      }
    } else {
      wanderAI(player, now);
    }
  } else {
    // Crewmate AI: dedicated to tasks
    aiCrewmateBehavior(player, allPlayers, now);
  }
}

function aiCrewmateBehavior(player: Player, allPlayers: Player[], now: number) {
  const imposters = allPlayers.filter(p => p.alive && p.role === 'imposter');
  const nearestImposter = imposters.length > 0
    ? imposters.reduce((a, b) => dist(player, a) < dist(player, b) ? a : b)
    : null;

  // If imposter is close, flee (drop task)
  if (nearestImposter && dist(player, nearestImposter) < 250) {
    player.doingTask = false;
    player.taskStationId = null;
    player.taskProgress = 0;
    const dx = player.x - nearestImposter.x;
    const dy = player.y - nearestImposter.y;
    const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    player.direction = { x: dx / d, y: dy / d };
    return;
  }

  // If doing a task, stay still
  if (player.doingTask) {
    player.direction = { x: 0, y: 0 };
    return;
  }

  // Find nearest incomplete task station
  // Use a pseudo-random target based on player id to spread them out
  wanderAI(player, now);
}

function wanderAI(player: Player, now: number) {
  if (now > player.aiChangeTime) {
    player.aiTargetX = 100 + Math.random() * (MAP_WIDTH - 200);
    player.aiTargetY = 100 + Math.random() * (MAP_HEIGHT - 200);
    player.aiChangeTime = now + 2000 + Math.random() * 3000;
  }
  const dx = player.aiTargetX - player.x;
  const dy = player.aiTargetY - player.y;
  const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  player.direction = { x: dx / d, y: dy / d };
}

function performAIActions(player: Player, allPlayers: Player[], state: GameState, now: number) {
  if (!player.alive || player.frozen || player.isHuman) return;

  if (player.role === 'imposter' && player.killCooldown <= 0) {
    const targets = allPlayers.filter(p => p.alive && p.role !== 'imposter' && dist(player, p) < KILL_RANGE);
    if (targets.length > 0) {
      targets[0].alive = false;
      targets[0].doingTask = false;
      targets[0].taskStationId = null;
      player.killCooldown = KILL_COOLDOWN;
    }
  }

  if (player.role === 'protector' && player.freezeCooldown <= 0) {
    const targets = allPlayers.filter(p => p.alive && p.role === 'imposter' && !p.frozen && dist(player, p) < FREEZE_RANGE);
    if (targets.length > 0) {
      targets[0].frozen = true;
      targets[0].frozenUntil = now + FREEZE_DURATION;
      player.freezeCooldown = FREEZE_COOLDOWN;
    }
  }

  // AI crewmate task completion
  if (player.role === 'crewmate' && !player.doingTask) {
    const incompleteTasks = state.taskStations.filter(t => !t.completed);
    if (incompleteTasks.length > 0) {
      const nearTask = incompleteTasks.find(t => dist(player, t) < TASK_RANGE);
      if (nearTask) {
        player.doingTask = true;
        player.taskStationId = nearTask.id;
        player.taskProgress = 0;
      }
    }
  }

  // Progress AI task
  if (player.role === 'crewmate' && player.doingTask && player.taskStationId !== null) {
    player.taskProgress += 0.004; // ~4-5 seconds
    if (player.taskProgress >= 1) {
      const station = state.taskStations.find(t => t.id === player.taskStationId);
      if (station && !station.completed) {
        station.completed = true;
        state.tasksCompleted++;
      }
      player.doingTask = false;
      player.taskStationId = null;
      player.taskProgress = 0;
    }
  }
}

export function updateGame(state: GameState, dt: number, keys: Set<string>, now: number): GameState {
  if (state.phase !== 'playing') return state;

  const human = state.players[0];

  // Human input (skip if doing task)
  if (human.alive && !human.frozen && !human.doingTask) {
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (dx || dy) {
      const d = Math.sqrt(dx * dx + dy * dy);
      human.direction = { x: dx / d, y: dy / d };
    } else {
      human.direction = { x: 0, y: 0 };
    }
  } else if (human.doingTask) {
    human.direction = { x: 0, y: 0 };
  }

  for (const p of state.players) {
    if (!p.alive) continue;

    if (p.frozen && now >= p.frozenUntil) {
      p.frozen = false;
    }
    if (p.frozen) continue;

    if (p.killCooldown > 0) p.killCooldown -= dt;
    if (p.freezeCooldown > 0) p.freezeCooldown -= dt;

    if (!p.isHuman) {
      updateAI(p, state.players, now);
      performAIActions(p, state.players, state, now);
    }

    p.x += p.direction.x * p.speed;
    p.y += p.direction.y * p.speed;
    p.x = Math.max(PLAYER_RADIUS, Math.min(state.mapWidth - PLAYER_RADIUS, p.x));
    p.y = Math.max(PLAYER_RADIUS, Math.min(state.mapHeight - PLAYER_RADIUS, p.y));
  }

  // Win: all tasks completed
  if (state.tasksCompleted >= state.totalTasks) {
    return { ...state, phase: 'gameover', winner: 'crew', timeElapsed: state.timeElapsed + dt };
  }

  // Win: all crew dead
  const aliveCrew = state.players.filter(p => p.alive && p.role === 'crewmate').length;
  if (aliveCrew === 0) {
    return { ...state, phase: 'gameover', winner: 'imposters', timeElapsed: state.timeElapsed + dt };
  }

  return { ...state, timeElapsed: state.timeElapsed + dt };
}

export function humanKill(state: GameState, now: number): boolean {
  const human = state.players[0];
  if (!human.alive || human.frozen || human.role !== 'imposter' || human.killCooldown > 0) return false;
  
  const targets = state.players.filter(p => p.alive && p.id !== 0 && p.role !== 'imposter' && dist(human, p) < KILL_RANGE);
  if (targets.length > 0) {
    targets[0].alive = false;
    targets[0].doingTask = false;
    human.killCooldown = KILL_COOLDOWN;
    return true;
  }
  return false;
}

export function humanFreeze(state: GameState, now: number): boolean {
  const human = state.players[0];
  if (!human.alive || human.frozen || human.role !== 'protector' || human.freezeCooldown > 0) return false;
  
  const targets = state.players.filter(p => p.alive && p.role === 'imposter' && !p.frozen && dist(human, p) < FREEZE_RANGE);
  if (targets.length > 0) {
    targets[0].frozen = true;
    targets[0].frozenUntil = now + FREEZE_DURATION;
    human.freezeCooldown = FREEZE_COOLDOWN;
    return true;
  }
  return false;
}

export function getNearbyTask(state: GameState): number | null {
  const human = state.players[0];
  if (!human.alive || human.frozen || human.role !== 'crewmate') return null;
  
  const nearby = state.taskStations.find(t => !t.completed && dist(human, t) < TASK_RANGE);
  return nearby ? nearby.id : null;
}
